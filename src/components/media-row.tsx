import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { posterUrl } from '@/api/tmdb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export interface MediaRowProps {
  href: Href;
  title: string;
  subtitle?: string;
  posterPath: string | null;
  trailing?: ReactNode;
  numberOfLines?: number;
}

export function MediaRow({ href, title, subtitle, posterPath, trailing, numberOfLines = 2 }: MediaRowProps) {
  const poster = posterUrl(posterPath, 'w185');

  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
        ) : (
          <ThemedView type="backgroundElement" style={styles.poster} />
        )}
        <View style={styles.rowText}>
          <ThemedText type="default" numberOfLines={numberOfLines}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          )}
        </View>
        {trailing}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowPressed: {
    opacity: 0.7,
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: Spacing.one,
  },
  rowText: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.half,
  },
});
