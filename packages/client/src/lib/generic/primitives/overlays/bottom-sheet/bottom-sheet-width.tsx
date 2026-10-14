import type * as React from 'react';
import { View, useWindowDimensions } from 'react-native';

// A fitted sheet measures its content with no width to go by, so the content takes the screen's.
export function SheetWidth(props: {
  fit: boolean | undefined;
  children: React.ReactElement;
}): React.JSX.Element {
  const { width } = useWindowDimensions();

  if (!props.fit) return props.children;

  return <View style={{ width }}>{props.children}</View>;
}
