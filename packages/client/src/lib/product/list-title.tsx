import { memo } from 'react';
import { Text } from '#primitives/content/text';

// The title at the top of a wide window's sidebar list, such as Sessions or Settings, under the window's own page title.
export const ListTitle = memo(function ListTitle(props: { children: string }) {
  return (
    <Text
      accessibilityRole="heading"
      aria-level={2}
      role="heading"
      numberOfLines={1}
    >
      {props.children}
    </Text>
  );
});
