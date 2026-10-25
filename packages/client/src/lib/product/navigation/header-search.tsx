import { Text } from '@repo/kit/primitives/content/text';
import {
  SearchField,
  type SearchFieldProps,
} from '@repo/kit/primitives/controls/search-field';
import type { HeaderOptions } from 'expo-router/react-navigation';
import type * as React from 'react';
import { type ReactElement, useState } from 'react';
import { View } from 'react-native';

// The web's JS header lays out its title and right containers by these; native-stack's options type leaves them out, so the header takes them through untyped. The title container grows so the search row fills it; the row keeps its own gap before the right items.
export const headerSearchRowLayout = {
  headerTitleContainerStyle: { flexGrow: 1, flexShrink: 1 },
  headerRightContainerStyle: { flexGrow: 0 },
} satisfies Pick<
  HeaderOptions,
  'headerTitleContainerStyle' | 'headerRightContainerStyle'
>;

export interface HeaderSearch {
  placeholder: string;
  onChangeText: (text: string) => void;
}

interface HeaderSearchRowProps {
  title: string;
  right?: readonly ReactElement[];
  search: HeaderSearch;
}

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
    <View className="me-2 min-w-0 flex-1 flex-row">
      <SearchField
        {...useSearchQuery(search)}
        title={<HeaderTitle title={title} />}
        actions={right.length ? right : undefined}
      />
    </View>
  );
}

function useSearchQuery(
  search: HeaderSearch,
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
}: Pick<HeaderSearchRowProps, 'title'>): React.JSX.Element {
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
