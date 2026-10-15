import { Column } from '@expo/ui';
import { createElement, type ReactElement } from 'react';
import { Platform } from 'react-native';
import type { NativeRowFrameProps } from './native-row-frame-props';

// SwiftUI's Form supplies the row surface and press drawing.
export function NativeRowFrame(props: NativeRowFrameProps): ReactElement {
  return createElement(
    Column,
    {
      spacing: 0,
      onPress: Platform.OS === 'ios' ? undefined : props.item.onPress,
      disabled: props.item.disabled,
      modifiers: props.modifiers,
    },
    props.children,
  );
}
