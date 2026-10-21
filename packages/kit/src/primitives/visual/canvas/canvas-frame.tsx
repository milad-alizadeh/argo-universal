import { useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { NativeCanvasInput } from './canvas-native-input';
import type { CanvasFrameProps } from './canvas-props';

function useNativeInput(props: CanvasFrameProps): NativeCanvasInput {
  const [input] = useState(() => new NativeCanvasInput(props));
  useLayoutEffect(() => input.update(props), [input, props]);

  return input;
}

export function CanvasFrame(props: CanvasFrameProps): React.JSX.Element {
  const input = useNativeInput(props);

  return (
    <View {...input.responder.panHandlers} {...nativeFrameProps(props)}>
      {props.children}
    </View>
  );
}

function nativeFrameProps(
  props: CanvasFrameProps,
): React.ComponentProps<typeof View> {
  return {
    accessible: true,
    accessibilityRole: 'image',
    accessibilityLabel: props.label,
    style: { width: '100%', height: '100%', overflow: 'hidden' },
    onLayout: ({ nativeEvent }) => props.onSize(nativeEvent.layout),
  };
}
