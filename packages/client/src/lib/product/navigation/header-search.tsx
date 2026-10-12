import type * as React from 'react';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { type TextInput, View } from 'react-native';
import { Input } from '#lib/generic/primitives/input';
import { SearchField } from '#lib/generic/primitives/search-field';
import { Text } from '#lib/generic/primitives/text';
import { HeaderButton } from '../header-button';
import type { ScreenHeaderProps } from './screen-header';

type Search = NonNullable<ScreenHeaderProps['search']>;
export interface HeaderSearchParts {
  // Takes the title's place while the reader searches.
  field?: React.JSX.Element;
  right: readonly ReactElement[];
}

/*
 * A native header without a search bar of its own: Search comes last among the trailing items,
 * and opens a field over the title row, the other items included; Close search clears it.
 */
export function useHeaderSearch(
  search: Search | undefined,
  right: readonly ReactElement[] = [],
): HeaderSearchParts {
  const [searching, setSearching] = useState(false);
  if (!search) return { right };
  const toggle = (): void => {
    if (searching) search.onChangeText('');
    setSearching(!searching);
  };
  const button = (
    <SearchToggle
      key="search"
      searching={searching}
      label={search.placeholder}
      onPress={toggle}
    />
  );
  if (!searching) return { right: [...right, button] };
  return { field: <OpenField search={search} />, right: [button] };
}

function SearchToggle(props: {
  searching: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <HeaderButton
      icon={props.searching ? 'close' : 'search'}
      paired
      accessibilityLabel={props.searching ? 'Close search' : props.label}
      onPress={props.onPress}
    />
  );
}

// Takes focus as it opens.
function OpenField({ search }: { search: Search }): React.JSX.Element {
  const input = useRef<TextInput>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <Input
      ref={input}
      autoCapitalize="none"
      accessibilityLabel={search.placeholder}
      placeholder={search.placeholder}
      onChangeText={search.onChangeText}
      className="type-body h-9 w-52 rounded-full border-0 bg-muted px-4 shadow-none sm:h-9"
    />
  );
}

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
