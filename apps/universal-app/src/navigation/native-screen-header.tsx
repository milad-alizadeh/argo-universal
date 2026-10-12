import { HeaderSearchRow, type ScreenHeaderProps } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { rightItems } from './header-right-items';

// The web's JS header takes these through, though native-stack's types leave them out.
const searchRowLayout = {
  headerTitleContainerStyle: { flexGrow: 1, flexShrink: 1, marginEnd: 8 },
  headerRightContainerStyle: { flexGrow: 0 },
};

// With search, the title row is the search row: Search, last, morphs into a field over the whole row.
export function NativeScreenHeader({
  title,
  left,
  right = [],
  search,
}: ScreenHeaderProps): React.JSX.Element {
  const row = search
    ? {
        headerTitle: (): React.JSX.Element => (
          <HeaderSearchRow title={title} right={right} search={search} />
        ),
        ...searchRowLayout,
      }
    : rightItems(right);
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title,
        headerLeft: left ? () => left : undefined,
        ...row,
      }}
    />
  );
}
