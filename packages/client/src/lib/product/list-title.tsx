import type * as React from 'react';
import { Text } from '#primitives/text';

// The title at the top of a wide window's sidebar list, such as Sessions or Settings.
export function ListTitle({
  children,
}: {
  children: string;
}): React.JSX.Element {
  return (
    <Text
      semanticRole="heading"
      aria-level={1}
      role="heading"
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}
