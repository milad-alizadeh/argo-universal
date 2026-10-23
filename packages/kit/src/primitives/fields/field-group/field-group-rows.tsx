import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import { flattenedChildren } from '#kit/flattened-children';

/*
 * Expo's web Section sets each row in a 48px frame with no vertical padding inside a clipping card, so a Slider's
 * focus ring is cut off. Each row gets a taller frame of its own, with room above and below its content.
 */
export function sectionRows(children: ReactNode): ReactNode {
  return Children.map(flattenedChildren(children), (row) => (
    <View className={rowFrame}>{row}</View>
  ));
}

const rowFrame = 'min-h-13 justify-center py-2';
