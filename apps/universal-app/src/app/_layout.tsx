import {
  AppProviders,
  PortalProvider,
  NavigationProvider,
  type DesktopBridge,
  SymbolImagesProvider,
  Toaster,
  useConnection,
  useRestoredThemeChoice,
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
import { holdPhonesInPortrait } from '@/lib/phone-orientation';
import { useNavigationTheme } from '@/lib/theme';
import { useWindowBackground } from '@/lib/window-background';
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

// Electron's preload gives the Server URL; elsewhere it comes from the environment.
const serverUrl =
  globalThis.window?.argo?.serverUrl ??
  process.env.EXPO_PUBLIC_ARGO_SERVER_URL ??
  'ws://127.0.0.1:7337';

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
      <ForegroundSignal />
      <ThemedApp />
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
      <Stack.Screen name="(frame)" />
      <Stack.Screen {...pushedScreen} />
      <Stack.Screen name="open/[...link]" />
      <Stack.Screen {...storybookScreen} />
    </Stack>
  );
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
