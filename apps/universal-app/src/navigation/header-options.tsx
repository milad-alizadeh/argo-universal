import {
  HeaderButton,
  HeaderItems,
  HeaderSearchRow,
  headerSearchRowLayout,
  type ScreenHeaderProps,
} from '@repo/client';
import type { NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';

type Search = NonNullable<ScreenHeaderProps['search']>;

interface SearchBarOptions {
  placeholder: string;
  autoCapitalize: 'none';
  onChangeText: (event: { nativeEvent: { text: string } }) => void;
  onClose: () => void;
}

// A native header's options from a page's header props: the title, the trailing items and the header's own search bar (`headerSearchBarOptions`), on the drawer (Android) or the stack (iOS).
export interface NativeHeaderOptions {
  title: string;
  headerRight?: () => React.JSX.Element;
  headerSearchBarOptions?: SearchBarOptions;
}

export function nativeHeaderOptions({
  title,
  right = [],
  search,
}: ScreenHeaderProps): NativeHeaderOptions {
  return {
    title,
    headerRight: trailingItems([...right, ...searchAction(search)]),
    headerSearchBarOptions: search && searchBarOptions(search),
  };
}

function trailingItems(
  items: readonly React.ReactElement[],
): NativeHeaderOptions['headerRight'] {
  if (!items.length) return undefined;

  return () => <HeaderItems>{items}</HeaderItems>;
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

// The web stack header's options from a page's header props. With search, the title row is the search row: Search, last, morphs into a field over the whole row. Only the options a page sets are written, so they never clear a section root's own.
export function webHeaderOptions({
  title,
  left,
  right = [],
  search,
}: ScreenHeaderProps): NativeStackNavigationOptions {
  const options = { title, ...titleRow(title, right, search) };

  if (left) options.headerLeft = (): React.ReactNode => left;

  return options;
}

function titleRow(
  title: string,
  right: readonly React.ReactElement[],
  search?: Search,
): NativeStackNavigationOptions {
  if (search)
    return {
      headerTitle: (): React.JSX.Element => (
        <HeaderSearchRow title={title} right={right} search={search} />
      ),
      ...headerSearchRowLayout,
    };

  const headerRight = trailingItems(right);

  return headerRight ? { headerRight } : {};
}
