import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type * as React from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';
import type { HeaderItem } from './header-items';
import type { HeaderSearch } from './header-search';
import { toolbarItem } from './header-toolbar';

type SearchBarOptions = NativeStackNavigationOptions['headerSearchBarOptions'];

/*
 * A phone header's search: the stack's own search bar. iOS 26 docks it at the bottom, in the thumb's reach; earlier
 * iOS stacks it below the header row, since an integrated bar there falls back to inline and squeezes the title, and
 * a focused bar there hides the header row. Closing or cancelling the bar clears the query.
 */
export function stackSearchBarOptions({
  placeholder,
  onChangeText,
}: HeaderSearch): SearchBarOptions {
  return {
    ...searchBarPlacement,
    placeholder,
    onChangeText: (event) => onChangeText(event.nativeEvent.text),
    onCancelButtonPress: () => onChangeText(''),
    onClose: () => onChangeText(''),
  };
}

const searchBarPlacement = {
  autoCapitalize: 'none',
  hideWhenScrolling: false,
  placement: hasLiquidGlass ? 'integrated' : 'stacked',
  hideNavigationBar: hasLiquidGlass,
} as const;

interface SearchDockProps {
  search?: HeaderSearch;
}

/*
 * iOS 26's bottom toolbar, which docks the search bar, with the search's action, such as New Session, beside it.
 * `placement="bottom"` only works in a page, so every page whose header searches renders this.
 */
function DockedSearch({ search }: SearchDockProps): React.ReactNode {
  const docked = !useWide() && search;

  return docked ? bottomToolbar(docked.action) : null;
}

// Before iOS 26 the bar sits in the header, so there is nothing to dock.
export const SearchDock = hasLiquidGlass ? DockedSearch : (): null => null;

// A flexible spacer keeps the action beside the bar in its own bubble rather than inside the field.
function bottomToolbar(action?: HeaderItem): React.JSX.Element {
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.SearchBarSlot />
      {action ? <Stack.Toolbar.Spacer /> : null}
      {action ? toolbarItem(action, true) : null}
    </Stack.Toolbar>
  );
}
