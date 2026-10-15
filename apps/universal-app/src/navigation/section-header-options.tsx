import { HeaderButton, type ScreenHeaderProps } from '@repo/client';
import type * as React from 'react';
import { View } from 'react-native';

type Search = NonNullable<ScreenHeaderProps['search']>;

interface SearchBarOptions {
  placeholder: string;
  autoCapitalize: 'none';
  onChangeText: (event: { nativeEvent: { text: string } }) => void;
  onClose: () => void;
}

// The options a section root's native header shares on the drawer (Android) and on the stack (iOS): the title, the trailing items and the search.
export interface SectionHeaderOptions {
  title: string;
  headerRight?: () => React.JSX.Element;
  headerSearchBarOptions?: SearchBarOptions;
}

export function sectionHeaderOptions({
  title,
  right = [],
  search,
}: ScreenHeaderProps): SectionHeaderOptions {
  return {
    title,
    headerRight: trailingItems([...right, ...searchAction(search)]),
    headerSearchBarOptions: search && searchBarOptions(search),
  };
}

function trailingItems(
  items: React.ReactElement[],
): SectionHeaderOptions['headerRight'] {
  if (!items.length) return undefined;

  return () => <View className="flex-row items-center gap-1">{items}</View>;
}

// Closing or clearing the search clears the query.
function searchBarOptions({
  placeholder,
  onChangeText,
}: Search): SearchBarOptions {
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
