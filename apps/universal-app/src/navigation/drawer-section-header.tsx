import { HeaderButton, type ScreenHeaderProps } from '@repo/client';
import { useNavigation } from 'expo-router';
import type {
  DrawerNavigationOptions,
  DrawerNavigationProp,
} from 'expo-router/drawer';
import type { ParamListBase } from 'expo-router/react-navigation';
import type * as React from 'react';
import { useLayoutEffect } from 'react';
import { View } from 'react-native';

type Search = NonNullable<ScreenHeaderProps['search']>;

// A phone section root's header is its drawer screen's: the drawer draws ☰ and the title, and this sets the title, the trailing items and the search.
export function DrawerSectionHeader(header: ScreenHeaderProps): null {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation
      .getParent<DrawerNavigationProp<ParamListBase>>()
      ?.setOptions(drawerHeaderOptions(header));
  });

  return null;
}

function drawerHeaderOptions({
  title,
  right = [],
  search,
}: ScreenHeaderProps): DrawerNavigationOptions {
  return {
    title,
    headerRight: trailingItems([...right, ...searchAction(search)]),
    headerSearchBarOptions: search && searchBarOptions(search),
  };
}

function trailingItems(
  items: React.ReactElement[],
): DrawerNavigationOptions['headerRight'] {
  if (!items.length) return undefined;

  return () => <View className="flex-row items-center gap-1">{items}</View>;
}

// Closing or clearing the search clears the query.
function searchBarOptions({
  placeholder,
  onChangeText,
}: Search): DrawerNavigationOptions['headerSearchBarOptions'] {
  return {
    placeholder,
    autoCapitalize: 'none',
    onChangeText: (event) => onChangeText(event.nativeEvent.text),
    onClose: () => onChangeText(''),
  };
}

// The item that goes with the search, such as New Session on iOS.
function searchAction(search?: Search): React.JSX.Element[] {
  if (!search?.action) return [];
  const { icon, accessibilityLabel, onPress } = search.action;

  return [
    <HeaderButton
      key="search-action"
      icon={icon}
      paired
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    />,
  ];
}
