import { useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { tintTransitionClassName } from '#kit/motion';
import { cn } from '#kit/utils';
import { RowPressContext } from './field-row-press';

/*
 * A pressable row tints its whole frame, hover then pressed, out to the card's edges (the margins undo Expo's row
 * padding); the card's clipping rounds the tint at the first and last rows. A grouped List's cell holds no Expo
 * padding, so it sets `flush` and keeps the frame's own.
 */
export function RowFrame(props: {
  children: ReactNode;
  flush?: boolean;
}): ReactElement {
  const [pressable, setPressable] = useState(false);

  return (
    <RowPressContext.Provider value={setPressable}>
      <View className={frameClass(pressable, props.flush)}>
        {props.children}
      </View>
    </RowPressContext.Provider>
  );
}

const frameClass = (pressable: boolean, flush?: boolean): string =>
  cn(rowFrame, !flush && '-mx-4', pressable && pressTint);

const rowFrame = 'min-h-13 justify-center px-4 py-2';

const pressTint = cn(
  'web:hover:bg-hover web:active:bg-pressed',
  tintTransitionClassName,
);
