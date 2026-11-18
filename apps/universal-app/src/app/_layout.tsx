import {
  AppProviders,
  DesktopVoiceProvider,
  PortalProvider,
  NavigationProvider,
  type DesktopBridge,
  SymbolImagesProvider,
  Toaster,
  useConnection,
  useRestoredThemeChoice,
  useShowsServer,
} from '@repo/client';
import '../../global.css';
import { registerDevMenuItems } from 'expo-dev-client';
import { router, Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useUniwind, withUniwind } from 'uniwind';
import { watchFontScale } from '@/lib/font-scale-watch';
import { pairLinkEnabled } from '@/lib/pair-link';
import { holdPhonesInPortrait } from '@/lib/phone-orientation';
import { useNavigationTheme } from '@/lib/theme';
import { useWindowBackground } from '@/lib/window-background';
import { appRoutes, reachableRoutes } from '@/navigation/reachable-routes';
import {
  pushedScreen,
  rootScreenLayout,
  useHeaderTint,
} from '@/navigation/section-stack';

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

holdPhonesInPortrait();

watchFontScale();

declare global {
  interface Window {
    // Set by the desktop preload script.
    argo?: DesktopBridge;
  }
}

/*
 * The Server on this Device. Electron's preload gives its URL, and the web App is served beside it. A phone or tablet
 * runs none and pairs with one instead, unless a dev build points it at a Server with EXPO_PUBLIC_ARGO_SERVER_URL.
 */
const serverUrl =
  globalThis.window?.argo?.serverUrl ??
  process.env.EXPO_PUBLIC_ARGO_SERVER_URL ??
  (Platform.OS === 'web' ? 'ws://127.0.0.1:7337' : undefined);

const renderSymbolImage = globalThis.window?.argo?.symbols?.render;

const RootView = withUniwind(GestureHandlerRootView);

export default function RootLayout(): React.JSX.Element {
  return (
    // The phone drawer's gestures need this root; it sits on the content surface, as the window does.
    <RootView className="flex-1 bg-content">
      {/* Screens follow the keyboard frame by frame through this. */}
      <KeyboardProvider>
        <SymbolImagesProvider render={renderSymbolImage}>
          <RestoredApp />
        </SymbolImagesProvider>
      </KeyboardProvider>
    </RootView>
  );
}

// The first screen waits for the theme chosen in Settings › Appearance, so it never flashes the system one.
function RestoredApp(): React.JSX.Element | null {
  if (!useRestoredThemeChoice()) return null;

  return (
    <AppProviders serverUrl={serverUrl}>
      <DesktopVoiceProvider desktop={globalThis.window?.argo !== undefined}>
        <ShownServerSignal />
        <ThemedApp />
      </DesktopVoiceProvider>
    </AppProviders>
  );
}

function ThemedApp(): React.JSX.Element {
  const { theme } = useUniwind();
  useWindowBackground();

  return (
    <ThemeProvider value={useNavigationTheme()}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <PortalProvider>
        <RootNavigator />
      </PortalProvider>
      <Toaster />
    </ThemeProvider>
  );
}

function RootNavigator(): React.JSX.Element {
  return (
    <NavigationProvider>
      <RootStack />
    </NavigationProvider>
  );
}

const storybookScreen = {
  name: '(dev)/storybook',
  options: { fullScreenGestureEnabled: false },
} satisfies ComponentProps<typeof Stack.Screen>;

// Storybook stays outside the Frame.
function RootStack(): React.JSX.Element {
  const headerTintColor = useHeaderTint();

  return (
    <Stack
      screenOptions={{ headerShown: false, headerTintColor }}
      screenLayout={rootScreenLayout}
    >
      {guardedScreens(useShowsServer())}
      <Stack.Screen {...storybookScreen} />
    </Stack>
  );
}

/*
 * A phone or tablet that holds no Server can reach only Pairing, and pairing one opens the App on it; unpairing the
 * last one brings Pairing back (#2388). The desktop and web Apps always hold their own Server.
 *
 * Each guard names where it sends a closed route. Without one, expo-router picks the first open route in file order,
 * and `(dev)/storybook` sorts before `pair`, so a dev build with no Server opened on Storybook.
 */
const guardedScreens = (showsServer: boolean): React.JSX.Element[] => {
  const reachable = reachableRoutes({ showsServer, pairLink: pairLinkEnabled });
  const reachesApp = reachable.includes(appRoutes[0]);
  const reachesPairing = reachable.includes('pair');

  return [
    <Stack.Protected key="app" guard={reachesApp} redirectTo="/pair">
      <Stack.Screen name="(frame)" />
      <Stack.Screen {...pushedScreen} />
      <Stack.Screen name="open/[...link]" />
    </Stack.Protected>,
    <Stack.Protected key="pair" guard={reachesPairing} redirectTo="/">
      <Stack.Screen name="pair" />
    </Stack.Protected>,
  ];
};

function ShownServerSignal(): React.JSX.Element | null {
  return useShowsServer() ? <ForegroundSignal /> : null;
}

// Coming to the foreground lets a waiting reconnect attempt go at once.
function ForegroundSignal(): null {
  const connection = useConnection();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') connection.foreground();
    });

    return (): void => subscription.remove();
  }, [connection]);

  return null;
}
