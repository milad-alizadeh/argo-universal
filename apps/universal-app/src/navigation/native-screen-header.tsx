import { HeaderSearchRow, type ScreenHeaderProps } from '@repo/client';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';
import { rightItems } from './header-right-items';
import { screenHeaderOptions } from './screen-header-options';

// The web's JS header takes these through, though native-stack's types leave them out.
const searchRowLayout = {
  headerTitleContainerStyle: { flexGrow: 1, flexShrink: 1, marginEnd: 8 },
  headerRightContainerStyle: { flexGrow: 0 },
};

// With search, the title row is the search row: Search, last, morphs into a field over the whole row.
export function NativeScreenHeader(
  header: ScreenHeaderProps,
): React.JSX.Element {
  return (
    <Stack.Screen
      options={{ ...screenHeaderOptions(header), ...titleRow(header) }}
    />
  );
}

function titleRow({
  title,
  right = [],
  search,
}: ScreenHeaderProps): NativeStackNavigationOptions {
  if (!search) return rightItems(right);

  return {
    headerTitle: (): React.JSX.Element => (
      <HeaderSearchRow title={title} right={right} search={search} />
    ),
    ...searchRowLayout,
  };
}
