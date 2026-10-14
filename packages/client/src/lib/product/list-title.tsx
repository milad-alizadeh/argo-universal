import { memo } from 'react';
import { Text } from '#primitives/display/text/text';

// The title at the top of a wide window's sidebar list, such as Sessions or Settings, under the window's own page title.
export const ListTitle = memo(function ListTitle(props: { children: string }) {
  return (
    <Text
      semanticRole="heading"
      aria-level={2}
      role="heading"
      numberOfLines={1}
    >
      {props.children}
    </Text>
  );
});
