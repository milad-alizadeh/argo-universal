import type { CoreSection } from '@repo/client';
import { useSizeClass } from '@repo/client/size-class';
import type { NativeStackNavigationOptions } from 'expo-router';
import type {
  ParamListBase,
  RouteProp,
  StackNavigationState,
} from 'expo-router/react-navigation';
import { Platform } from 'react-native';

/*
 * A tablet's Settings pages in a medium window's pane draw as on a phone, under the stock header with its title where
 * the platform puts it: centred on iPad, at the start on Android (Argo · Settings, "Medium (600–1099)", #927). The
 * sidebar swaps the pane's first page without a transition, and it has no Back, since the list beside it is what it
 * came from; a page drilled into from it pushes, with the stock Back.
 */
const phonePaneSections: ReadonlySet<CoreSection> = new Set(['settings']);

interface PaneScreen {
  route: RouteProp<ParamListBase>;
  navigation: { getState: () => StackNavigationState<ParamListBase> };
}

// The section's root sits under the pane's first page, as the list's anchor for a narrow window's Back.
const firstPageIndex = 1;

const isFirstPage = ({ route, navigation }: PaneScreen): boolean =>
  navigation.getState().routes.findIndex((item) => item.key === route.key) <=
  firstPageIndex;

const firstPageOptions = {
  headerBackVisible: false,
  gestureEnabled: false,
  animation: 'none',
} satisfies NativeStackNavigationOptions;

// The page starts under the whole header, its stacked search bar included, rather than scrolling under a clear one.
const opaqueHeader = {
  headerTransparent: false,
} satisfies NativeStackNavigationOptions;

interface PaneSectionOptions {
  screenOptions: (screen: PaneScreen) => NativeStackNavigationOptions;
  rootOptions: NativeStackNavigationOptions;
}

// The pane's pages take a phone stack's header options; the section's root stays hidden behind the list.
export function phonePaneSectionOptions(
  phoneOptions: NativeStackNavigationOptions,
): PaneSectionOptions {
  const paneOptions = { ...phoneOptions, ...opaqueHeader };

  return {
    screenOptions: (screen) =>
      isFirstPage(screen)
        ? { ...paneOptions, ...firstPageOptions }
        : paneOptions,
    rootOptions: { headerShown: false },
  };
}

// Native tablets only: the web's medium window keeps the page's own header.
export function usePhonePane(section: CoreSection): boolean {
  const medium = useSizeClass() === 'medium';

  return medium && Platform.OS !== 'web' && phonePaneSections.has(section);
}
