import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

const sizeConfig = {
  sm: { size: 28, stroke: 3 },
  md: { size: 40, stroke: 4 },
  lg: { size: 56, stroke: 5 },
} as const;

export function ProgressRing({
  progress,
  size = 'md',
}: {
  progress: number;
  size?: keyof typeof sizeConfig;
}) {
  const { size: s, stroke } = sizeConfig[size];
  const radius = (s - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <View style={[styles.wrap, { width: s, height: s, borderRadius: s / 2 }]}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={styles.rotated}>
        <Circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          stroke={Colors.dark.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <ThemedText style={[styles.label, size === 'sm' && styles.labelSmall]}>{Math.round(clamped)}%</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 5, 10, 0.6)',
  },
  rotated: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  label: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: '#f4f4f8',
  },
  labelSmall: {
    fontSize: 8,
  },
});
