import {
  HeaderSearchRow,
  headerSearchRowLayout,
  type ScreenHeaderProps,
} from '@repo/client';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';

// A stack page's header row, on a narrow web window and on a phone's pushed pages. With search, the title row is the search row: Search, last, morphs into a field over the whole row.
export function WebScreenHeader(header: ScreenHeaderProps): React.JSX.Element {
  const { title, left } = header;

  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title,
        headerLeft: left ? () => left : undefined,
        ...titleRow(header),
      }}
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
    ...headerSearchRowLayout,
  };
}

function rightItems(
  right: NonNullable<ScreenHeaderProps['right']>,
): NativeStackNavigationOptions {
  if (!right.length) return {};

  return {
    headerRight: (): React.JSX.Element => (
      <View className="flex-row gap-1">{right}</View>
    ),
  };
}
