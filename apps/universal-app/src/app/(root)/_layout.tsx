import { NativeSidebarListPlace, useShowsServer } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { use, type ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-screens/experimental';
import { pairLinkEnabled } from '@/lib/pair-link';
import { appRoutes, reachableRoutes } from '@/navigation/reachable-routes';
import {
  pushedScreen,
  rootScreenLayout,
  useHeaderTint,
} from '@/navigation/section-stack';

const storybookScreen = {
  name: '(dev)/storybook',
  options: { fullScreenGestureEnabled: false },
} satisfies ComponentProps<typeof Stack.Screen>;

// Storybook stays outside the Frame.
export default function RootStack(): React.JSX.Element {
  const headerTintColor = useHeaderTint();
  const nativeSidebar = use(NativeSidebarListPlace);

  const stack = (
    <Stack
      screenOptions={{ headerShown: false, headerTintColor }}
      screenLayout={rootScreenLayout}
    >
      {guardedScreens(useShowsServer())}
      <Stack.Screen {...storybookScreen} />
    </Stack>
  );

  // UIKit extends the detail column behind its sidebars. Its horizontal safe area is the readable column.
  return nativeSidebar ? (
    <SafeAreaView edges={{ left: true, right: true }}>{stack}</SafeAreaView>
  ) : (
    stack
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
