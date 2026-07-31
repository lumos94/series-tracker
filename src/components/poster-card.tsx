import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { posterUrl, type MediaType } from '@/api/tmdb';
import type { WatchStatus } from '@/lib/watch-status';

const sizeConfig = {
  sm: { width: 112, height: 160 },
  md: { width: 144, height: 208 },
  lg: { width: 176, height: 256 },
} as const;

export interface PosterCardProps {
  id: number;
  type: MediaType;
  title: string;
  posterPath: string | null;
  status?: WatchStatus;
  progress?: number;
  size?: keyof typeof sizeConfig;
  fill?: boolean;
}

export function PosterCard({ id, type, title, posterPath, status, progress, size = 'md', fill = false }: PosterCardProps) {
  const poster = posterUrl(posterPath, size === 'lg' ? 'w342' : 'w185');
  const href = type === 'tv' ? ({ pathname: '/show/[id]', params: { id: String(id) } } as const) : ({ pathname: '/movie/[id]', params: { id: String(id) } } as const);
  const frameStyle = fill ? styles.frameFill : sizeConfig[size];

  return (
    <Link href={href} asChild>
      <Pressable style={[styles.card, !fill && { width: sizeConfig[size].width }]}>
        <View style={[styles.frame, frameStyle]}>
          {poster ? (
            <Image source={{ uri: poster }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={styles.noImage}>
              <ThemedText type="small" themeColor="textSecondary">
                No image
              </ThemedText>
            </View>
          )}

          {status && <StatusBadge status={status} style={styles.badgeOverlay} />}

          {progress !== undefined && progress > 0 && progress < 100 && (
            <View style={styles.ringOverlay}>
              <ProgressRing progress={progress} size="sm" />
            </View>
          )}

          {progress === 100 && (
            <View style={styles.watchedOverlay}>
              <View style={styles.watchedBadge}>
                <ThemedText style={styles.watchedCheck}>✓</ThemedText>
              </View>
            </View>
          )}
        </View>
        <ThemedText type="small" numberOfLines={2} style={styles.title}>
          {title}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  frame: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
    backgroundColor: Colors.dark.cosmicSurface,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  frameFill: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    left: Spacing.two,
    top: Spacing.two,
  },
  ringOverlay: {
    position: 'absolute',
    right: Spacing.two,
    top: Spacing.two,
  },
  watchedOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 5, 10, 0.4)',
  },
  watchedBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(52, 211, 153, 0.9)',
    padding: Spacing.two,
  },
  watchedCheck: {
    color: '#05050a',
    fontWeight: '700',
  },
  title: {
    lineHeight: 18,
  },
});
