import '../../global.css';

import { AppProviders } from '@repo/client';
import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useUniwind } from 'uniwind';
import { NAV_THEME } from '@/lib/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

const serverUrl =
  process.env.EXPO_PUBLIC_ARGO_SERVER_URL ?? 'ws://127.0.0.1:7337';

export default function RootLayout() {
  const { theme } = useUniwind();

  return (
    <AppProviders serverUrl={serverUrl}>
      <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Projects' }} />
          <Stack.Screen name="sessions/[id]" options={{ title: 'Session' }} />
        </Stack>
      </ThemeProvider>
    </AppProviders>
  );
}
