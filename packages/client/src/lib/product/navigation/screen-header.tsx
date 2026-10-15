import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';
import {
  type HeaderItem,
  HeaderItemButton,
  HeaderItemRow,
} from './header-items';
import {
  type HeaderSearch,
  HeaderSearchRow,
  headerSearchRowLayout,
} from './header-search';
import { headerToolbar } from './header-toolbar';
import { SearchDock, stackSearchBarOptions } from './phone-search-bar';

// One line: a leading item, the title, and one or two trailing items.
export interface ScreenHeaderProps {
  title: string;
  // Leads the header, such as ☰ on a narrow section root.
  left?: HeaderItem;
  right?: readonly HeaderItem[];
  search?: HeaderSearch;
}

type HeaderOptions = NativeStackNavigationOptions;

interface SearchBarOptions {
  placeholder: string;
  autoCapitalize: 'none';
  onChangeText: (event: { nativeEvent: { text: string } }) => void;
  onClose: () => void;
}

// What Android's drawer header takes from a section root's header props.
export interface DrawerHeaderOptions {
  title: string;
  headerRight?: () => React.JSX.Element;
  headerSearchBarOptions?: SearchBarOptions;
}

function trailingItems(
  items: readonly HeaderItem[],
): Pick<DrawerHeaderOptions, 'headerRight'> {
  if (!items.length) return {};

  return { headerRight: () => <HeaderItemRow items={items} /> };
}

// The drawer's own search bar; closing or clearing it clears the query.
function drawerSearchBar(
  search?: HeaderSearch,
): Pick<DrawerHeaderOptions, 'headerSearchBarOptions'> {
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

// Android's drawer header for a section root: the title, the trailing items as JS buttons and the header's own search bar; the leading ☰ is the drawer's.
export function drawerHeaderOptions({
  title,
  right = [],
  search,
}: ScreenHeaderProps): DrawerHeaderOptions {
  return {
    title,
    ...trailingItems(right),
    ...drawerSearchBar(search),
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

  const leading = left
    ? { headerLeft: (): ReactNode => <HeaderItemButton item={left} /> }
    : {};

  return { title, ...leading, ...webTitleRow(header) };
}

// A native stack header's options: the title and the stack's own search bar.
function nativeHeaderOptions({
  title,
  search,
}: ScreenHeaderProps): HeaderOptions {
  return search
    ? { title, headerSearchBarOptions: stackSearchBarOptions(search) }
    : { title };
}

// The stack header's options from a page's header props, as this platform draws them; its items come from `screenHeaderToolbars`.
export const screenHeaderOptions: (header: ScreenHeaderProps) => HeaderOptions =
  Platform.OS === 'web' ? webHeaderOptions : nativeHeaderOptions;

const searchAction = (search?: HeaderSearch): HeaderItem[] =>
  search?.action ? [search.action] : [];

// The trailing items, then the search's action, such as New Session, which iOS 26 docks beside the search bar instead.
function nativeTrailing({
  right = [],
  search,
}: ScreenHeaderProps): HeaderItem[] {
  return hasLiquidGlass ? [...right] : [...right, ...searchAction(search)];
}

/*
 * A native stack header's items as stock bar button items, to put in a page or in a layout's `Stack.Screen`; the web's
 * JS header takes its items through `screenHeaderOptions`.
 */
export function screenHeaderToolbars(
  header: ScreenHeaderProps,
): (React.JSX.Element | null)[] {
  if (Platform.OS === 'web') return [];

  return [
    headerToolbar('left', header.left ? [header.left] : []),
    headerToolbar('right', nativeTrailing(header)),
  ];
}

// A narrow window's page header, which the page sets on its section stack; a wide window's page draws its own title, so there this sets nothing.
export function ScreenHeader(
  props: ScreenHeaderProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <>
      <Stack.Screen options={screenHeaderOptions(props)} />
      {screenHeaderToolbars(props)}
      <SearchDock search={props.search} />
    </>
  );
}
