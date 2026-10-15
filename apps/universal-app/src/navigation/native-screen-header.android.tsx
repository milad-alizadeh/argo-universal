import {
  HeaderButton,
  type ScreenHeaderProps,
  useAppBarSearch,
} from '@repo/client';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';
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

/*
 * Material's open search keeps the app bar and fills its slots: Back where the navigation icon was, the field where
 * the title's text started, Clear where Search was. The bar keeps its height, so nothing below it moves.
 * Options merge, so each state sets every slot the other one fills.
 */
function appBarOptions(
  header: ScreenHeaderProps,
  appBar: AppBar,
): NativeStackNavigationOptions {
  return {
    ...leadingSlots(header, appBar),
    ...trailingSlot(barItems(header, appBar), appBar),
  };
}

// The navigation icon and title while closed; Back and the field while open.
function leadingSlots(
  { title, left }: ScreenHeaderProps,
  { field, ...appBar }: AppBar,
): NativeStackNavigationOptions {
  if (!field)
    return { ...screenHeaderOptions({ title, left }), headerTitle: undefined };

  return {
    ...screenHeaderOptions({ title, left: backButton(appBar.close) }),
    headerTitle: (): ReactElement => field,
  };
}

// The screen's own items, then Search last.
function barItems(
  { right = [], search }: ScreenHeaderProps,
  appBar: AppBar,
): readonly ReactElement[] {
  return search ? [...right, searchButton(search, appBar.openSearch)] : right;
}

/*
 * One trailing slot for both states: the bar's items stay mounted, hidden while search is open, so opening and
 * closing never re-lay the bar or remount its menus, and the open field keeps its focus.
 */
function trailingSlot(
  items: readonly ReactElement[],
  { open, clear }: AppBar,
): NativeStackNavigationOptions {
  if (!items.length) return { headerRight: undefined };

  return {
    headerRight: (): ReactElement => (
      <View className="flex-row gap-1">
        {clear ? clearButton(clear) : null}
        <View className={open ? 'hidden' : 'flex-row gap-1'}>{items}</View>
      </View>
    ),
  };
}

function backButton(onPress: () => void): ReactElement {
  return (
    <HeaderButton
      icon="arrow-left"
      accessibilityLabel="Close search"
      onPress={onPress}
    />
  );
}

function clearButton(onPress: () => void): ReactElement {
  return (
    <HeaderButton
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
