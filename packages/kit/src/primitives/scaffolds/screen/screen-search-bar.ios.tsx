import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { hasLiquidGlass } from '#kit/native-header';
import type { ScreenProps } from './screen-props';
import { useScreenSearchBar } from './use-screen-search-bar';

// iOS 26 docks an iPhone's search bar at the bottom; earlier iOS and iPad keep it below the header row.
const docksSearch = hasLiquidGlass && Platform.OS === 'ios' && !Platform.isPad;

const placement = {
  placement: docksSearch ? 'integrated' : 'stacked',
  // Only the docked bar needs the header hidden while searching; otherwise UIKit's own default holds.
  hideNavigationBar: docksSearch ? true : undefined,
  hideWhenScrolling: false,
  autoCapitalize: 'none',
} as const;

export function ScreenSearchBar(props: ScreenProps): ReactElement {
  return (
    <>
      <Stack.SearchBar {...useScreenSearchBar(props)} {...placement} />
      {docksSearch ? (
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.SearchBarSlot />
        </Stack.Toolbar>
      ) : null}
    </>
  );
}
