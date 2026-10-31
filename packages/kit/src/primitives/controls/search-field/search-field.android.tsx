import { Header } from 'expo-router/react-navigation';
import type * as React from 'react';
import { View } from 'react-native';
import type { SearchFieldProps } from './search-field-props';

// The row sits flat on its pane, under no status bar, with no hairline of its own.
const flatRow = {
  headerStatusBarHeight: 0,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: 'transparent' },
  // The stock header gives its title 16dp each side; the page's title starts on its column's line, as a page with no search does.
  headerTitleContainerStyle: { marginHorizontal: 0 },
} as const;

/*
 * Android's header search, as a phone's drawer header draws it (#753): the stock header row with the title, the
 * actions and Search last, which swaps the row for the search view; closing clears the query. The morphing field is
 * the web's and desktop's (#927).
 */
export function SearchField(props: SearchFieldProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Header
        {...flatRow}
        title={props.label}
        headerTitle={() => props.title}
        headerRight={() => headerActions(props.actions)}
        headerSearchBarOptions={searchBarOptions(props)}
      />
    </View>
  );
}

type SearchBarOptions = NonNullable<
  React.ComponentProps<typeof Header>['headerSearchBarOptions']
>;

function searchBarOptions({
  label,
  onChangeText,
}: SearchFieldProps): SearchBarOptions {
  return {
    placeholder: label,
    autoCapitalize: 'none',
    onChangeText: (event) => onChangeText(event.nativeEvent.text),
    onClose: () => onChangeText(''),
  };
}

function headerActions(actions: React.ReactNode): React.JSX.Element | null {
  if (!actions) return null;

  return <View className="flex-row items-center gap-1">{actions}</View>;
}

export type { SearchFieldProps, SearchQueryProps } from './search-field-props';
