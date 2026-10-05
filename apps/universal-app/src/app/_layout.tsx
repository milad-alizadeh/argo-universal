import '../../global.css';

import {
  AppProviders,
  type Navigate,
  NavigationProvider,
  useConnection,
} from '@repo/client';
import { createBrowserMachineInspection } from '@repo/machine-log/browser';
import { PortalHost } from '@rn-primitives/portal';
import { registerDevMenuItems } from 'expo-dev-client';
import { type Href, router, Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useUniwind } from 'uniwind';
import { useNavigationTheme } from '@/lib/theme';
import { hrefFor } from '@/navigation/routes';

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

const inspection = createBrowserMachineInspection({
  enabled: __DEV__ && process.env.EXPO_PUBLIC_ARGO_MACHINE_LOG === '1',
  inspectEnabled:
    __DEV__ && process.env.EXPO_PUBLIC_ARGO_MACHINE_INSPECT === '1',
  processName: 'app',
  writeLine: (line) => console.log(line.trimEnd()),
});

// Screens in @repo/client navigate through this.
const navigate: Navigate = (destination) =>
  router.navigate(hrefFor(destination) as Href);

export default function RootLayout() {
  const { theme } = useUniwind();
  const navigationTheme = useNavigationTheme();

  return (
    // The phone drawer's gestures need this root.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders serverUrl={serverUrl} inspect={inspection.inspect}>
        <ForegroundSignal />
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <NavigationProvider navigate={navigate}>
            {/* Storybook stays outside the shell. */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(shell)" />
              <Stack.Screen name="(dev)/storybook" />
            </Stack>
          </NavigationProvider>
          <PortalHost />
        </ThemeProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

// Coming to the foreground lets a waiting reconnect attempt go at once (spec 0002 section 11).
function ForegroundSignal() {
  const connection = useConnection();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') connection.send({ type: 'app.foreground' });
    });
    return () => subscription.remove();
  }, [connection]);
  return null;
}
