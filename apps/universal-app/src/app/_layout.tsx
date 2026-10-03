import '../../global.css';

import { AppProviders } from '@repo/client';
import { registerDevMenuItems } from 'expo-dev-client';
import { router, Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useUniwind } from 'uniwind';
import { NAV_THEME } from '@/lib/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// The dev menu exists only in native development builds; on web it throws.
if (__DEV__ && Platform.OS !== 'web') {
  registerDevMenuItems([
    {
      name: 'Open Storybook',
      callback: () => router.push('/(dev)/storybook'),
      shouldCollapse: true,
    },
  ]);
}

declare global {
  interface Window {
    // Set by the desktop preload script (spec section 9).
    argo?: {
      serverUrl: string | null;
      window: { minimize(): void; maximize(): void; close(): void };
    };
  }
}

// Electron's preload gives the Server URL; elsewhere it comes from the environment (spec section 8).
const serverUrl =
  globalThis.window?.argo?.serverUrl ??
  process.env.EXPO_PUBLIC_ARGO_SERVER_URL ??
  'ws://127.0.0.1:7337';

export default function RootLayout() {
  const { theme } = useUniwind();

  return (
    <AppProviders serverUrl={serverUrl}>
      <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Projects' }} />
          <Stack.Screen name="sessions/[id]" options={{ title: 'Session' }} />
          <Stack.Screen
            name="(dev)/storybook"
            options={{ headerShown: false }}
          />
        </Stack>
      </ThemeProvider>
    </AppProviders>
  );
}
