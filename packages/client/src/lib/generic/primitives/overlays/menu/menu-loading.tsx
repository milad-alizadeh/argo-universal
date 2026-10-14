import type * as React from 'react';
import { View } from 'react-native';
import { Spinner } from '#primitives/display/spinner';
import { Text } from '#primitives/display/text';
import { menuLoadingLabel } from './menu-props';

// The web menu's only row while its options load: the platform spinner and what it waits for.
export function MenuLoadingRow(): React.JSX.Element {
  return (
    <View className="min-h-9 flex-row items-center gap-3 px-4 py-1.5">
      <Spinner accessibilityLabel={menuLoadingLabel} />
      <Text
        role="body"
        aria-hidden
        className="select-none text-card-foreground"
      >
        {menuLoadingLabel}
      </Text>
    </View>
  );
}
