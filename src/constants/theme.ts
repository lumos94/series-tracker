/**
 * Cosmic TV Tracker design tokens — dark, cinematic, violet/indigo/cyan accents.
 * Ported from the Lovable "Cosmic TV Tracker" design (see AGENTS.md / rn-notes).
 * The app runs in dark mode only, so light and dark share the same values.
 */

import '@/global.css';

import { Platform } from 'react-native';

const cosmic = {
  text: '#f4f4f8',
  background: '#05050a',
  backgroundElement: '#0f0f1a',
  backgroundSelected: '#1a1a2e',
  textSecondary: '#a3a3b8',
  border: 'rgba(255, 255, 255, 0.1)',

  primary: '#8b5cf6',
  primaryForeground: '#fefeff',
  cosmicVoid: '#05050a',
  cosmicSurface: '#0f0f1a',
  cosmicElevated: '#1a1a2e',
  cosmicViolet: '#8b5cf6',
  cosmicIndigo: '#6366f1',
  cosmicCyan: '#22d3ee',
  cosmicGlow: '#a78bfa',

  statusWatching: '#f5b342',
  statusCompleted: '#34d399',
  statusPlanned: '#60a5fa',
  statusDropped: '#e0735c',
} as const;

export const Colors = {
  light: cosmic,
  dark: cosmic,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Gradient stops for the cosmic-gradient effect (violet -> indigo -> cyan). */
export const CosmicGradient = [cosmic.cosmicViolet, cosmic.cosmicIndigo, cosmic.cosmicCyan] as const;

export const FontFamily = {
  displayRegular: 'SpaceGrotesk_400Regular',
  displayMedium: 'SpaceGrotesk_500Medium',
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
