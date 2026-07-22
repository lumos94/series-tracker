import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { Colors } from '@/constants/theme';
import { maybeAutoSync } from '@/lib/backup';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
});

const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    background: Colors.light.background,
    surface: Colors.light.backgroundElement,
    onSurface: Colors.light.text,
  },
};

const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    background: Colors.dark.background,
    surface: Colors.dark.backgroundElement,
    onSurface: Colors.dark.text,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
    maybeAutoSync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <PaperProvider theme={colorScheme === 'dark' ? paperDarkTheme : paperLightTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="show/[id]" options={{ title: '' }} />
            <Stack.Screen name="movie/[id]" options={{ title: '' }} />
          </Stack>
        </PaperProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
