import {
  HeaderButton,
  hasLiquidGlass,
  type ScreenHeaderProps,
} from '@repo/client';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { rightItems } from './header-right-items';
import { useHeaderSearchOptions } from './header-search-options';
import { screenHeaderOptions } from './screen-header-options';

type Search = NonNullable<ScreenHeaderProps['search']>;

type Action = NonNullable<Search['action']>;

type SearchBarOptions = NativeStackNavigationOptions['headerSearchBarOptions'];

// iOS draws the native search bar: iOS 26 docks it at the bottom, in the thumb's reach; earlier iOS stacks it below the header row, since an integrated bar there falls back to inline and squeezes the title. The search's action, such as New Session, is a header item on every iOS.
export function NativeScreenHeader(
  header: ScreenHeaderProps,
): React.JSX.Element {
  const searchOptions = useHeaderSearchOptions();

  return (
    <>
      <Stack.Screen options={headerOptions(header, searchOptions)} />
      {header.search && hasLiquidGlass && <BottomSearch />}
    </>
  );
}

type SearchOptions = ReturnType<typeof useHeaderSearchOptions>;

function headerOptions(
  { right = [], search, ...header }: ScreenHeaderProps,
  searchOptions: SearchOptions,
): NativeStackNavigationOptions {
  return {
    ...screenHeaderOptions(header),
    ...rightItems([...right, ...searchAction(search)]),
    headerSearchBarOptions: searchBarOptions(search, searchOptions),
  };
}

function searchAction(search: Search | undefined): ReactElement[] {
  return search?.action ? [actionButton(search.action)] : [];
}

function searchBarOptions(
  search: Search | undefined,
  searchOptions: SearchOptions,
): SearchBarOptions {
  return (
    search && {
      ...searchOptions(search),
      placement: hasLiquidGlass ? 'integrated' : 'stacked',
      // Before iOS 26 a focused bar hides the header row, but not our custom items in it, which pile up in its corner; the row stays.
      hideNavigationBar: hasLiquidGlass,
    }
  );
}

// The docked bar.
function BottomSearch(): React.JSX.Element {
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.SearchBarSlot />
    </Stack.Toolbar>
  );
}

function actionButton(action: Action): ReactElement {
  return (
    <HeaderButton
      key="search-action"
      icon={action.icon}
      paired
      accessibilityLabel={action.accessibilityLabel}
      onPress={action.onPress}
    />
  );
}
