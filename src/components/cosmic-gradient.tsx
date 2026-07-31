import { LinearGradient } from 'expo-linear-gradient';
import type { ViewProps } from 'react-native';

import { CosmicGradient as GradientColors } from '@/constants/theme';

export function CosmicGradientView({ style, ...rest }: ViewProps) {
  return <LinearGradient colors={GradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style} {...rest} />;
}
