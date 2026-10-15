import { Column } from '@expo/ui';
import { createElement, type ReactElement } from 'react';
import type { NativeRowFrameProps } from './native-row-frame-props';

// SwiftUI's Form supplies the row surface and press drawing.
export function NativeRowFrame({
  item,
  modifiers,
  children,
}: NativeRowFrameProps): ReactElement {
  return createElement(
    Column,
    { spacing: 0, onPress: item.onPress, disabled: item.disabled, modifiers },
    children,
  );
}
