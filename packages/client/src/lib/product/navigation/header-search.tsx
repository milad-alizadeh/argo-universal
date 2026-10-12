import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { SearchField } from '#lib/generic/primitives/inputs/search-field/search-field';
import type { ScreenHeaderProps } from './screen-header';

type Search = NonNullable<ScreenHeaderProps['search']>;

/*
 * A web header's title row with search: the title and trailing items, then Search, which morphs
 * into a field over the whole row, as the wide window's headers do.
 */
export function HeaderSearchRow({
  title,
  right = [],
  search,
}: Pick<ScreenHeaderProps, 'title' | 'right'> & {
  search: Search;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const onChangeText = (text: string): void => {
    setQuery(text);
    search.onChangeText(text);
  };
  return (
    <View className="min-w-0 flex-1 flex-row">
      <SearchField
        label={search.placeholder}
        value={query}
        onChangeText={onChangeText}
        title={
          <Text
            role="nav-title"
            semanticRole="heading"
            aria-level={1}
            numberOfLines={1}
          >
            {title}
          </Text>
        }
        actions={right.length ? right : undefined}
      />
    </View>
  );
}
