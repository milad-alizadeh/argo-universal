import { HeaderSearchBar, type ScreenHeaderProps } from '@repo/client';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import { useState } from 'react';
import { rightItems } from './header-right-items';

type ScreenOptions = NativeStackNavigationOptions;

// Open search takes the whole header; options merge, so each item is cleared by name.
const searchingItems: ScreenOptions = {
  headerLeft: undefined,
  headerBackVisible: false,
  headerRight: undefined,
};

// With search, Material's search bar takes the title's place; open, it takes the whole header.
export function NativeScreenHeader(
  props: ScreenHeaderProps,
): React.JSX.Element {
  const [searching, setSearching] = useState(false);
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title: props.title,
        ...(searching ? searchingItems : restingItems(props)),
        ...searchTitle(props.search, setSearching),
      }}
    />
  );
}

function restingItems({ left, right = [] }: ScreenHeaderProps): ScreenOptions {
  return {
    headerLeft: left ? () => left : undefined,
    headerBackVisible: true,
    ...rightItems(right),
  };
}

function searchTitle(
  search: ScreenHeaderProps['search'],
  onSearchingChange: (searching: boolean) => void,
): ScreenOptions {
  if (!search) return {};
  return {
    headerTitle: () => (
      <HeaderSearchBar search={search} onSearchingChange={onSearchingChange} />
    ),
  };
}
