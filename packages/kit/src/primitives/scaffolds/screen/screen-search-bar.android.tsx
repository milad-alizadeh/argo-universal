import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import type { ScreenProps } from './screen-props';
import { useScreenSearchBar } from './use-screen-search-bar';

export function ScreenSearchBar(props: ScreenProps): ReactElement {
  return (
    <Stack.SearchBar {...useScreenSearchBar(props)} autoCapitalize="none" />
  );
}
