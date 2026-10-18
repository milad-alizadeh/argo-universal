import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Platform } from 'react-native';
import { HeaderItems } from '#lib/product/header-button';
import { useWide } from '../../generic/use-wide/use-wide';
import {
  type HeaderSearch,
  HeaderSearchRow,
  headerSearchRowLayout,
} from './header-search';

/*
 * One line: a leading item, the title, and one or two trailing items, as the JS headers draw them: Android's drawer
 * header and the web's stack header. Native stack headers take only the title from here; each page declares its own
 * `Stack.Toolbar` and `Stack.SearchBar`.
 */
export interface ScreenHeaderProps {
  // Pages with an inline header on a wide window hide the stack header there too.
  hideFrom?: 'wide';
  title: string;
  left?: ReactNode;
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

// What Android's drawer header takes from a section root's header props.
export interface NativeHeaderOptions {
  title: string;
  headerRight?: () => React.JSX.Element;
  headerSearchBarOptions?: SearchBarOptions;
}

function trailingItems(
  items: readonly ReactElement[],
): Pick<NativeHeaderOptions, 'headerRight'> {
  if (!items.length) return {};

  return { headerRight: () => <HeaderItems>{items}</HeaderItems> };
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

// Android's drawer header for a section root: the title, the trailing items and the header's own search bar; the leading ☰ is the drawer's stock toggle.
export function nativeHeaderOptions({
  title,
  right = [],
  search,
}: ScreenHeaderProps): NativeHeaderOptions {
  return { title, ...trailingItems(right), ...searchBar(search) };
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

// A native stack header takes only the title; the page declares its items and search itself.
const stackTitleOptions = ({ title }: ScreenHeaderProps): HeaderOptions => ({
  title,
});

// The stack header's options from a page's header props, as this platform draws them.
export const screenHeaderOptions: (header: ScreenHeaderProps) => HeaderOptions =
  Platform.OS === 'web' ? webHeaderOptions : stackTitleOptions;

// The phone shell's page header, which the page sets on its section stack; a wide window's page draws its own title, so there this sets nothing.
export function ScreenHeader(
  props: ScreenHeaderProps,
): React.JSX.Element | null {
  const wide = useWide();

  if (props.hideFrom === 'wide') {
    const options = { ...screenHeaderOptions(props), headerShown: !wide };

    return <Stack.Screen options={options} />;
  }

  if (wide) return null;

  return <Stack.Screen options={screenHeaderOptions(props)} />;
}
