import {
  AppProviders,
  PortalHost,
  type LeaveGuard,
  type Navigate,
  NavigationProvider,
  type RenderSymbolImage,
  SymbolImagesProvider,
  Toaster,
  useConnection,
} from '@repo/client';
import '../../global.css';
import { registerDevMenuItems } from 'expo-dev-client';
import { router, Stack, useNavigation } from 'expo-router';
import { ThemeProvider, usePreventRemove } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import type * as React from 'react';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useUniwind } from 'uniwind';
import { useNavigationTheme } from '@/lib/theme';
import { hrefFor, paramsOf } from '@/navigation/routes';

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

// The page asks to hold its own removal; the router keeps it while asked, and carries on when told to.
const useLeaveGuard: LeaveGuard = (active, onBlocked) => {
  const navigation = useNavigation();
  usePreventRemove(active, ({ data }) =>
    onBlocked(() => navigation.dispatch(data.action)),
  );
};

// Screens in @repo/client navigate through this.
const navigate: Navigate = (destination, options) =>
  options?.inPlace
    ? router.setParams(paramsOf(destination))
    : moveFor(options)(hrefFor(destination));

const moveFor = (options: Parameters<Navigate>[1]): typeof router.navigate =>
  options?.replace ? router.replace : router.navigate;

export default function RootLayout(): React.JSX.Element {
  return (
    // The phone drawer's gestures need this root.
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Screens follow the keyboard frame by frame through this. */}
      <KeyboardProvider>
        <SymbolImagesProvider render={renderSymbolImage}>
          <AppProviders serverUrl={serverUrl}>
            <ForegroundSignal />
            <ThemedApp />
          </AppProviders>
        </SymbolImagesProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp(): React.JSX.Element {
  const { theme } = useUniwind();

  return (
    <ThemeProvider value={useNavigationTheme()}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
      <PortalHost />
      <Toaster />
    </ThemeProvider>
  );
}

function RootNavigator(): React.JSX.Element {
  return (
    <NavigationProvider navigate={navigate} leaveGuard={useLeaveGuard}>
      <RootStack />
    </NavigationProvider>
  );
}

// Storybook stays outside the shell.
function RootStack(): React.JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(shell)" />
      <Stack.Screen name="(dev)/storybook" />
    </Stack>
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
