import {
  AppProviders,
  type Navigate,
  type NativeSheets,
  NativeSheetsProvider,
  NavigationProvider,
  type RenderSymbolImage,
  SymbolImagesProvider,
  useConnection,
} from '@repo/client';
import '../../global.css';
import { PortalHost } from '@rn-primitives/portal';
import { registerDevMenuItems } from 'expo-dev-client';
import { router, Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import type * as React from 'react';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useUniwind } from 'uniwind';
import { useNavigationTheme } from '@/lib/theme';
import { hrefFor } from '@/navigation/routes';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// The dev menu exists only in native development builds; on web it throws.
if (__DEV__ && Platform.OS !== 'web') {
  void registerDevMenuItems([
    {
      name: 'Open Storybook',
      callback: (): void => router.push('/(dev)/storybook'),
      shouldCollapse: true,
    },
  ]);
}

declare global {
  interface Window {
    // Set by the desktop preload script.
    argo?: {
      serverUrl: string | null;
      window: { minimize(): void; maximize(): void; close(): void };
      // Only on macOS, where the desktop app draws SF Symbols.
      symbols?: { render: RenderSymbolImage };
    };
  }
}

// Electron's preload gives the Server URL; elsewhere it comes from the environment.
const serverUrl =
  globalThis.window?.argo?.serverUrl ??
  process.env.EXPO_PUBLIC_ARGO_SERVER_URL ??
  'ws://127.0.0.1:7337';

const renderSymbolImage = globalThis.window?.argo?.symbols?.render;

// Phones present Composer menus as native sheets; the Agent and model one has its own stack.
const nativeSheets: NativeSheets | undefined =
  Platform.OS === 'web'
    ? undefined
    : {
        agentModel: () => router.push('/agent-model'),
        content: () => router.push('/composer-sheet'),
        close: () => router.dismiss(),
      };

// iOS opens this tall until its first page has measured itself.
const sheetStartHeight = 0.4;

const sheetOptions = {
  presentation: 'formSheet' as const,
  sheetAllowedDetents:
    Platform.OS === 'android'
      ? ('fitToContents' as const)
      : [sheetStartHeight, 1],
  sheetGrabberVisible: true,
};

// Screens in @repo/client navigate through this.
const navigate: Navigate = (destination, options) =>
  options?.replace
    ? router.replace(hrefFor(destination))
    : router.navigate(hrefFor(destination));

export default function RootLayout(): React.JSX.Element {
  const { theme } = useUniwind();
  const navigationTheme = useNavigationTheme();

  return (
    // The phone drawer's gestures need this root.
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Screens follow the keyboard frame by frame through this. */}
      <KeyboardProvider>
        <SymbolImagesProvider render={renderSymbolImage}>
          <AppProviders serverUrl={serverUrl}>
            <ForegroundSignal />
            <ThemeProvider value={navigationTheme}>
              <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
              <NavigationProvider navigate={navigate}>
                <NativeSheetsProvider value={nativeSheets}>
                  {/* Storybook stays outside the shell. */}
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(shell)" />
                    <Stack.Screen name="agent-model" options={sheetOptions} />
                    <Stack.Screen
                      name="composer-sheet"
                      options={sheetOptions}
                    />
                    <Stack.Screen name="(dev)/storybook" />
                  </Stack>
                </NativeSheetsProvider>
              </NavigationProvider>
              <PortalHost />
            </ThemeProvider>
          </AppProviders>
        </SymbolImagesProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

// Coming to the foreground lets a waiting reconnect attempt go at once.
function ForegroundSignal(): null {
  const connection = useConnection();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') connection.send({ type: 'app.foreground' });
    });
    return (): void => subscription.remove();
  }, [connection]);
  return null;
}
