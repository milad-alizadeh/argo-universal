import { Stack } from 'expo-router';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';

// An iPad's window is regular width at every size, where iPadOS neither docks the bar nor centres the title beside it.
const isPad = Platform.OS === 'ios' && Platform.isPad;

// iOS 26 docks the search bar at the bottom of a phone.
const bottomSearch = process.env.EXPO_OS === 'ios' && hasLiquidGlass && !isPad;

interface PhoneSearchBarProps {
  placeholder: string;
  onSearch: (search: string) => void;
  // A stock item beside the docked bar on iOS 26, in its own bubble, such as New Session.
  dockedAction?: ReactNode;
}

/*
 * A phone header's search: the stack's own search bar, and no other Search in the header (#927). iOS 26 docks it at
 * the bottom, in the thumb's reach; earlier iOS stacks it below the header row, since an integrated bar there falls
 * back to inline and squeezes the title. An iPad stacks it too. A wide window searches in the page.
 */
export function PhoneSearchBar(
  props: PhoneSearchBarProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <>
      <Stack.SearchBar {...searchBarProps(props)} {...placement} />
      {bottomSearch ? bottomToolbar(props.dockedAction) : null}
    </>
  );
}

// On an iPad the bar sits below the header row and the stock title keeps its centre (#927).
const placement = {
  autoCapitalize: 'none',
  hideWhenScrolling: false,
  placement: bottomSearch ? 'integrated' : 'stacked',
  hideNavigationBar: bottomSearch,
} as const;

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
