import {
  HeaderButton,
  type ScreenHeaderProps,
  useAppBarSearch,
} from '@repo/client';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { rightItems } from './header-right-items';
import { screenHeaderOptions } from './screen-header-options';

type Search = ScreenHeaderProps['search'];

// Android's top app bar: the title, its items, then Search last, which opens the search in the bar itself.
export function NativeScreenHeader(
  header: ScreenHeaderProps,
): React.JSX.Element {
  const appBar = useAppBarSearch(appBarQuery(header.search));

  return <Stack.Screen options={appBarOptions(header, appBar)} />;
}

type AppBar = ReturnType<typeof useAppBarSearch>;

function appBarOptions(
  header: ScreenHeaderProps,
  appBar: AppBar,
): NativeStackNavigationOptions {
  return appBar.field
    ? openSearchOptions(header, appBar, appBar.field)
    : closedOptions(header, appBar);
}

// Options merge, so each state sets every slot the other one fills.
function closedOptions(
  { right = [], search, ...header }: ScreenHeaderProps,
  appBar: AppBar,
): NativeStackNavigationOptions {
  const items = search
    ? [...right, searchButton(search, appBar.openSearch)]
    : right;

  return {
    ...screenHeaderOptions(header),
    headerTitle: undefined,
    headerRight: undefined,
    ...rightItems(items),
  };
}

/*
 * Material's open search keeps the app bar and fills its slots: Back where the navigation icon was, the field where
 * the title's text started, Clear where Search was. The bar keeps its height, so nothing below it moves.
 */
function openSearchOptions(
  header: ScreenHeaderProps,
  appBar: AppBar,
  field: ReactElement,
): NativeStackNavigationOptions {
  const clear = appBar.clear;

  return {
    ...screenHeaderOptions({ title: header.title, left: backButton(appBar) }),
    headerTitle: (): ReactElement => field,
    headerRight: undefined,
    ...rightItems(clear ? [clearButton(clear)] : []),
  };
}

function backButton(appBar: AppBar): ReactElement {
  return (
    <HeaderButton
      icon="arrow-left"
      accessibilityLabel="Close search"
      onPress={appBar.close}
    />
  );
}

function clearButton(onPress: () => void): ReactElement {
  return (
    <HeaderButton
      key="clear"
      icon="close"
      accessibilityLabel="Clear search"
      onPress={onPress}
    />
  );
}

function appBarQuery(search: Search): Parameters<typeof useAppBarSearch>[0] {
  return (
    search && { label: search.placeholder, onChangeText: search.onChangeText }
  );
}

function searchButton(
  search: NonNullable<Search>,
  onPress: () => void,
): ReactElement {
  return (
    <HeaderButton
      key="search"
      icon="search"
      accessibilityLabel={search.placeholder}
      onPress={onPress}
    />
  );
}
