import type { ScreenHeaderProps } from '@repo/client';
import type { NativeStackNavigationOptions } from 'expo-router';
import { useCSSVariable } from 'uniwind';

type Search = NonNullable<ScreenHeaderProps['search']>;

type SearchBarOptions = NativeStackNavigationOptions['headerSearchBarOptions'];

/*
 * The native stack's own search bar: closing or cancelling it clears the query.
 * The bar's documented `tintColor` (caret and Cancel, iOS only) takes the accent; left alone it inherits the header's tint, the neutral primary.
 */
export function useHeaderSearchOptions(): (search: Search) => SearchBarOptions {
  const accent = useCSSVariable('--color-accent');
  const tintColor = typeof accent === 'string' ? accent : undefined;

  return (search) => ({
    tintColor,
    placeholder: search.placeholder,
    autoCapitalize: 'none',
    hideWhenScrolling: false,
    onChangeText: ({ nativeEvent }) => search.onChangeText(nativeEvent.text),
    onCancelButtonPress: () => search.onChangeText(''),
    onClose: () => search.onChangeText(''),
  });
}
