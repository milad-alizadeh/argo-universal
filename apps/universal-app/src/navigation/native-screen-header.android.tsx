import type { ScreenHeaderProps } from '@repo/client';
import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import { useCSSVariable } from 'uniwind';
import { rightItems } from './header-right-items';
import { headerSearchOptions } from './header-search-options';

type SearchBarOptions = NativeStackNavigationOptions['headerSearchBarOptions'];

// Android draws the native stack's search: a Search action that opens a field over the whole header.
export function NativeScreenHeader({
  title,
  left,
  right = [],
  search,
}: ScreenHeaderProps): React.JSX.Element {
  const colors = useSearchColors();
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title,
        headerLeft: left ? () => left : undefined,
        ...rightItems(right),
        headerSearchBarOptions: search && {
          ...headerSearchOptions(search),
          ...colors,
        },
      }}
    />
  );
}

// The field's plate takes the page surface, which also replaces its default underline; text and icons follow the theme.
function useSearchColors(): SearchBarOptions {
  const [surface, text, hint] = useCSSVariable([
    '--color-sidebar',
    '--color-foreground',
    '--color-muted-foreground',
  ]).map((value) => (typeof value === 'string' ? value : undefined));
  return {
    barTintColor: surface,
    textColor: text,
    hintTextColor: hint,
    headerIconColor: text,
  };
}
