import { Children, type ReactElement, type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { flattenedChildren } from '#kit/flattened-children';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { RowPressContext } from '#primitives/fields/field-row';

/*
 * Expo's web Section sets each row in a 48px frame with no vertical padding inside a clipping card, so a Slider's
 * focus ring is cut off. Each row gets a taller frame of its own, with room above and below its content.
 */
export function sectionRows(children: ReactNode): ReactNode {
  return Children.map(flattenedChildren(children), (row) => (
    <RowFrame>{row}</RowFrame>
  ));
}

/*
 * A pressable row tints its whole frame, hover then pressed, out to the card's edges (the margins undo Expo's row
 * padding); the card's clipping rounds the tint at the first and last rows.
 */
function RowFrame(props: { children: ReactNode }): ReactElement {
  const [pressable, setPressable] = useState(false);

  return (
    <RowPressContext.Provider value={setPressable}>
      <View className={cn(rowFrame, pressable && pressTint)}>
        {props.children}
      </View>
    </RowPressContext.Provider>
  );
}

const rowFrame = '-mx-4 min-h-13 justify-center px-4 py-2';

const pressTint = cn(
  'web:hover:bg-hover web:active:bg-pressed',
  tintTransitionClassName,
);
