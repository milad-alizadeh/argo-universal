import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Input } from '../src/lib/generic/primitives/input';
import { Text } from '../src/lib/generic/primitives/text';
import { HeaderButton } from '../src/lib/product/header-button';
import type { ScreenHeaderProps } from '../src/lib/product/navigation/screen-header';

// Stands in for the native stack's header in stories: one line of left item, title and right items.
export function ScreenHeaderMock({
  title,
  left,
  right,
  search,
}: ScreenHeaderProps): React.JSX.Element {
  const [searching, setSearching] = useState(false);
  return (
    <View className="h-11 flex-row items-center bg-background px-1">
      <View className="w-23 flex-row">{left}</View>
      {searching && search ? (
        <Input
          autoFocus
          accessibilityLabel={search.placeholder}
          placeholder={search.placeholder}
          onChangeText={search.onChangeText}
          className="h-8 min-w-0 flex-1"
        />
      ) : (
        <Text
          role="heading"
          aria-level={1}
          numberOfLines={1}
          className="min-w-0 flex-1 text-center text-[17px] font-semibold"
        >
          {title}
        </Text>
      )}
      <View className="w-23 flex-row justify-end gap-1">
        {search && (
          <HeaderButton
            icon={searching ? 'close' : 'search'}
            paired
            accessibilityLabel={searching ? 'Close search' : search.placeholder}
            onPress={() => {
              if (searching) search.onChangeText('');
              setSearching(!searching);
            }}
          />
        )}
        {right}
      </View>
    </View>
  );
}
