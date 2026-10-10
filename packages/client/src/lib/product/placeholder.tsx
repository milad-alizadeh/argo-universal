import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';

export function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-gutter py-6">
      <Text role="heading" aria-level={1} variant="h3">
        {title}
      </Text>
      <Text variant="muted" className="text-center">
        {description}
      </Text>
    </View>
  );
}
