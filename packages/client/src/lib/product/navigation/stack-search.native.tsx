import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useWide } from '#lib/generic/use-wide/use-wide';

type Props = { placeholder: string; onSearch: (search: string) => void };

const bottomSearch = process.env.EXPO_OS === 'ios' && hasLiquidGlass;

// Shared native search behavior: cancellation clears the query; iOS 26 docks it at the bottom.
export function StackSearch(props: Props): ReactElement | null {
  if (useWide()) return null;

  return (
    <>
      <SearchBar {...props} />
      {bottomSearch && (
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.SearchBarSlot />
        </Stack.Toolbar>
      )}
    </>
  );
}

function SearchBar({ placeholder, onSearch }: Props): ReactElement {
  return (
    <Stack.SearchBar
      placeholder={placeholder}
      autoCapitalize="none"
      hideWhenScrolling={false}
      onChangeText={(event) => onSearch(event.nativeEvent.text)}
      onCancelButtonPress={() => onSearch('')}
      onClose={() => onSearch('')}
    />
  );
}
