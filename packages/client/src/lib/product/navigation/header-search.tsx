import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import {
  SearchField,
  type SearchFieldProps,
} from '#primitives/inputs/search-field';
import type { ScreenHeaderProps } from './screen-header';

type Search = NonNullable<ScreenHeaderProps['search']>;

type HeaderSearchRowProps = Pick<ScreenHeaderProps, 'title' | 'right'> & {
  search: Search;
};

/*
 * A web header's title row with search: the title and trailing items, then Search, which morphs
 * into a field over the whole row, as the wide window's headers do.
 */
export function HeaderSearchRow({
  title,
  right = [],
  search,
}: HeaderSearchRowProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 flex-row">
      <SearchField
        {...useSearchQuery(search)}
        title={<HeaderTitle title={title} />}
        actions={right.length ? right : undefined}
      />
    </View>
  );
}

function useSearchQuery(
  search: Search,
): Pick<SearchFieldProps, 'label' | 'value' | 'onChangeText'> {
  const [query, setQuery] = useState('');

  const onChangeText = (text: string): void => {
    setQuery(text);
    search.onChangeText(text);
  };

  return { label: search.placeholder, value: query, onChangeText };
}

function HeaderTitle({
  title,
}: Pick<ScreenHeaderProps, 'title'>): React.JSX.Element {
  return (
    <Text
      role="nav-title"
      accessibilityRole="heading"
      aria-level={1}
      numberOfLines={1}
    >
      {title}
    </Text>
  );
}
