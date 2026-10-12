import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '../src/lib/generic/primitives/text';
import { HeaderSearchRow } from '../src/lib/product/navigation/header-search';
import type { ScreenHeaderProps } from '../src/lib/product/navigation/screen-header';

// Stands in for the native stack's header in stories: one line of left item, title and right items.
export function ScreenHeaderMock({
  title,
  left,
  right,
  search,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <View className="h-11 flex-row items-center bg-background px-1">
      <View className="w-23 flex-row">{left}</View>
      {search ? (
        // As the web header draws it: Search last, opening over the whole row.
        <HeaderSearchRow title={title} right={right} search={search} />
      ) : (
        <>
          <Text
            semanticRole="heading"
            role="nav-title"
            aria-level={1}
            numberOfLines={1}
            className="min-w-0 flex-1 text-center"
          >
            {title}
          </Text>
          <View className="w-23 flex-row justify-end gap-1">{right}</View>
        </>
      )}
    </View>
  );
}
