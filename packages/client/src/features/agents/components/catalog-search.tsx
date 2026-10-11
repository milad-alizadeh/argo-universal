import type * as React from 'react';
import { View } from 'react-native';
import { Input } from '#lib/generic/primitives/input';
import { Icon } from '../../../lib/generic/symbols/icon';

export type CatalogSearchProps = {
  search: string;
  onSearch: (search: string) => void;
};

export function CatalogSearch(props: CatalogSearchProps): React.JSX.Element {
  return (
    <View className="h-10 flex-row items-center gap-2 rounded-lg web:rounded-search bg-muted px-3">
      <Icon name="search" className="text-muted-foreground" />
      <CatalogSearchInput {...props} />
    </View>
  );
}

function CatalogSearchInput({
  search,
  onSearch,
}: CatalogSearchProps): React.JSX.Element {
  return (
    <Input
      className="type-body h-10 sm:h-10 flex-1 border-0 rounded-none bg-transparent dark:bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
      accessibilityLabel="Search Agents"
      placeholder="Search Agents"
      value={search}
      onChangeText={onSearch}
      autoCapitalize="none"
    />
  );
}
