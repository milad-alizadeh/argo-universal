import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Platform } from 'react-native';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { HeaderButton, HeaderItems } from '#lib/product/header-button';
import {
  type HeaderSearch,
  HeaderSearchRow,
  headerSearchRowLayout,
} from './header-search';

// One line: a leading item, the title, and one or two trailing items.
export interface ScreenHeaderProps {
  title: string;
  left?: ReactNode;
  // Each a separate item, so iOS 26 gives each its own glass bubble.
  right?: readonly ReactElement[];
  search?: HeaderSearch;
}

type HeaderOptions = NativeStackNavigationOptions;

interface SearchBarOptions {
  placeholder: string;
  autoCapitalize: 'none';
  onChangeText: (event: { nativeEvent: { text: string } }) => void;
  onClose: () => void;
}

type HeaderRightItems = NonNullable<HeaderOptions['unstable_headerRightItems']>;

// What a native header takes from a page's header props, in a shape both the drawer's header (Android) and the stack's (iOS) accept; only iOS 26's stack header gets the separate items.
export interface NativeHeaderOptions {
  title: string;
  headerRight?: () => React.JSX.Element;
  unstable_headerRightItems?: HeaderRightItems;
  headerSearchBarOptions?: SearchBarOptions;
}

type TrailingOptions = Pick<
  NativeHeaderOptions,
  'headerRight' | 'unstable_headerRightItems'
>;

type HeaderRightItem = ReturnType<HeaderRightItems>[number];

// Spaced items, so iOS 26 draws each in its own glass bubble.
function separateItems(elements: readonly ReactElement[]): HeaderRightItem[] {
  const items = elements.flatMap((element, index) => [
    ...(index > 0 ? [{ type: 'spacing' as const, spacing: 8 }] : []),
    { type: 'custom' as const, element },
  ]);

  // The native side inserts a spacer at its index in the reversed list, which expo-router leaves unset.
  return items.map((item, index) =>
    item.type === 'spacing'
      ? { ...item, index: items.length - 1 - index }
      : item,
  );
}

function trailingItems(items: readonly ReactElement[]): TrailingOptions {
  if (!items.length) return {};

  if (hasLiquidGlass)
    return { unstable_headerRightItems: () => separateItems(items) };

  return { headerRight: () => <HeaderItems>{items}</HeaderItems> };
}

// The item that goes with the search, such as New Session on iOS.
function searchAction(search?: HeaderSearch): React.JSX.Element[] {
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

// The header's own search bar; closing or clearing it clears the query.
function searchBar(
  search?: HeaderSearch,
): Pick<NativeHeaderOptions, 'headerSearchBarOptions'> {
  if (!search) return {};
  const { placeholder, onChangeText } = search;

  return {
    headerSearchBarOptions: {
      placeholder,
      autoCapitalize: 'none',
      onChangeText: (event) => onChangeText(event.nativeEvent.text),
      onClose: () => onChangeText(''),
    },
  };
}

// A native header's options: the title, the trailing items and the header's own search bar, on the drawer (Android) or the stack (iOS). Only the options a page sets are written, so they never clear a section root's own.
export function nativeHeaderOptions({
  title,
  right = [],
  search,
}: ScreenHeaderProps): NativeHeaderOptions {
  return {
    title,
    ...trailingItems([...right, ...searchAction(search)]),
    ...searchBar(search),
  };
}

// The web's JS header: with search, the title row is the search row, where Search, last, morphs into a field over the whole row.
function webTitleRow({
  title,
  right = [],
  search,
}: ScreenHeaderProps): HeaderOptions {
  if (!search) return trailingItems(right);

  return {
    headerTitle: () => (
      <HeaderSearchRow title={title} right={right} search={search} />
    ),
    ...headerSearchRowLayout,
  };
}

function webHeaderOptions(header: ScreenHeaderProps): HeaderOptions {
  const { title, left } = header;
  const leading = left ? { headerLeft: (): ReactNode => left } : {};

  return { title, ...leading, ...webTitleRow(header) };
}

// The stack header's options from a page's header props, as this platform draws them.
export const screenHeaderOptions: (header: ScreenHeaderProps) => HeaderOptions =
  Platform.OS === 'web' ? webHeaderOptions : nativeHeaderOptions;

// A narrow window's page header, which the page sets on its section stack; a wide window's page draws its own title, so there this sets nothing.
export function ScreenHeader(
  props: ScreenHeaderProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return <Stack.Screen options={screenHeaderOptions(props)} />;
}
