import type * as React from 'react';
import { Platform } from 'react-native';
import { Text } from '#lib/generic/primitives/text';

export function CodeBlockTitle({
  title,
}: {
  title: string;
}): React.JSX.Element {
  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="head"
      accessibilityLabel={title}
      testID="code-block-title"
      className="min-w-0 flex-1 type-code text-muted-foreground web:[direction:rtl] web:text-left"
    >
      {Platform.OS === 'web' && title.includes('/')
        ? `\u2066${title}\u2069`
        : title}
    </Text>
  );
}
