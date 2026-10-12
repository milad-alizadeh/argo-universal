import type { ScreenHeaderProps } from '@repo/client';
import type { NativeStackNavigationOptions } from 'expo-router';

type Search = NonNullable<ScreenHeaderProps['search']>;
type SearchBarOptions = NativeStackNavigationOptions['headerSearchBarOptions'];

// The native stack's own search bar: closing or cancelling it clears the query.
export function headerSearchOptions(search: Search): SearchBarOptions {
  return {
    placeholder: search.placeholder,
    placement: 'integrated',
    autoCapitalize: 'none',
    hideWhenScrolling: false,
    onChangeText: ({ nativeEvent }) => search.onChangeText(nativeEvent.text),
    onCancelButtonPress: () => search.onChangeText(''),
    onClose: () => search.onChangeText(''),
  };
}
