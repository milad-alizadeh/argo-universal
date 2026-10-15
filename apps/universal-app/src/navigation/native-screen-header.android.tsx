import {
  HeaderButton,
  type ScreenHeaderProps,
  useAppBarSearch,
} from '@repo/client';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { rightItems } from './header-right-items';
import { screenHeaderOptions } from './screen-header-options';

type Search = ScreenHeaderProps['search'];

// Android's top app bar: the title, its items, then Search last, which opens a full-width search in the bar's place.
export function NativeScreenHeader(
  header: ScreenHeaderProps,
): React.JSX.Element {
  const appBar = useAppBarSearch(appBarQuery(header.search));

  return <Stack.Screen options={appBarOptions(header, appBar)} />;
}

function appBarOptions(
  { right = [], search, ...header }: ScreenHeaderProps,
  appBar: ReturnType<typeof useAppBarSearch>,
): NativeStackNavigationOptions {
  const items = search
    ? [...right, searchButton(search, appBar.openSearch)]
    : right;

  return {
    ...screenHeaderOptions(header),
    ...rightItems(items),
    ...openBar(appBar.bar),
  };
}

function appBarQuery(search: Search): Parameters<typeof useAppBarSearch>[0] {
  return (
    search && { label: search.placeholder, onChangeText: search.onChangeText }
  );
}

function searchButton(
  search: NonNullable<Search>,
  onPress: () => void,
): ReactElement {
  return (
    <HeaderButton
      key="search"
      icon="search"
      accessibilityLabel={search.placeholder}
      onPress={onPress}
    />
  );
}

// Options merge, so closing sets the header back to the native bar rather than leaving the open search.
function openBar(bar: ReactElement | null): NativeStackNavigationOptions {
  return { header: bar ? (): ReactElement => bar : undefined };
}
