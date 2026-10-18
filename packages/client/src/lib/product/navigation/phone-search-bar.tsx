import { Stack } from 'expo-router';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { useInCompactScope } from '../../generic/use-size-class/compact-scope';

// iOS 26 docks the search bar at the bottom.
const bottomSearch = process.env.EXPO_OS === 'ios' && hasLiquidGlass;

interface PhoneSearchBarProps {
  placeholder: string;
  onSearch: (search: string) => void;
  // A stock item beside the docked bar on iOS 26, in its own bubble, such as New Session.
  dockedAction?: ReactNode;
}

/*
 * A phone header's search: the stack's own search bar, and no other Search in the header (#927). iOS 26 docks it at
 * the bottom, in the thumb's reach; earlier iOS stacks it below the header row, since an integrated bar there falls
 * back to inline and squeezes the title. A tablet's pane stacks it. A wide window searches in the page.
 */
export function PhoneSearchBar(
  props: PhoneSearchBarProps,
): React.JSX.Element | null {
  const inPane = useInCompactScope();

  if (useWide()) return null;

  return (
    <>
      <Stack.SearchBar {...searchBarProps(props)} {...placement(inPane)} />
      {dockedToolbar(inPane, props.dockedAction)}
    </>
  );
}

const searchBarPlacement = {
  autoCapitalize: 'none',
  hideWhenScrolling: false,
  placement: hasLiquidGlass ? 'integrated' : 'stacked',
  hideNavigationBar: hasLiquidGlass,
} as const;

/*
 * A tablet's pane is regular width, where iPadOS neither docks the bar nor centres the title beside an integrated
 * field, so the bar sits below the header row and the stock title keeps its centre (#927).
 */
const paneSearchBarPlacement = {
  ...searchBarPlacement,
  placement: 'stacked',
  hideNavigationBar: false,
} as const;

type SearchBarPlacement =
  | typeof searchBarPlacement
  | typeof paneSearchBarPlacement;

const placement = (inPane: boolean): SearchBarPlacement =>
  inPane ? paneSearchBarPlacement : searchBarPlacement;

type SearchBarProps = Pick<
  React.ComponentProps<typeof Stack.SearchBar>,
  'placeholder' | 'onChangeText' | 'onCancelButtonPress' | 'onClose'
>;

// Closing or cancelling the search bar clears the query.
function searchBarProps({
  placeholder,
  onSearch,
}: PhoneSearchBarProps): SearchBarProps {
  const clear = (): void => onSearch('');

  return {
    placeholder,
    onChangeText: (event): void => onSearch(event.nativeEvent.text),
    onCancelButtonPress: clear,
    onClose: clear,
  };
}

// A tablet's pane stacks the bar instead, since iPadOS ignores a bottom toolbar's search.
const dockedToolbar = (
  inPane: boolean,
  action: ReactNode,
): React.JSX.Element | null =>
  bottomSearch && !inPane ? bottomToolbar(action) : null;

// A flexible spacer keeps the action beside the bar in its own bubble rather than inside the field.
function bottomToolbar(action: ReactNode): React.JSX.Element {
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.SearchBarSlot />
      {action ? <Stack.Toolbar.Spacer /> : null}
      {action}
    </Stack.Toolbar>
  );
}
