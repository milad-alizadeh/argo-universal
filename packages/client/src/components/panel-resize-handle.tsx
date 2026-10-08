import type * as React from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type PanResponderGestureState,
  PanResponder,
  View,
} from 'react-native';

// How far one arrow key or accessibility action moves the edge, in points.
const keyboardStep = 16;

export interface PanelResizeHandleProps {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  direction: 1 | -1;
  edge?: 'left' | 'right';
  onDragStateChange?: (dragging: boolean) => void;
  onChange: (width: number) => void;
}

export function PanelResizeHandle({
  label,
  value,
  minimum,
  maximum,
  direction,
  edge = 'right',
  onChange,
  onDragStateChange,
}: PanelResizeHandleProps): React.JSX.Element {
  const responder = useResizeResponder({
    value,
    direction,
    onChange,
    onDragStateChange,
  });
  return (
    <View
      {...responder.panHandlers}
      className={`absolute ${edge === 'left' ? '-left-1' : '-right-1'} bottom-0 top-shell-bar z-10 w-2`}
      accessible
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: minimum, max: maximum, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) =>
        onChange(
          Math.max(
            minimum,
            Math.min(
              maximum,
              value +
                (nativeEvent.actionName === 'increment'
                  ? keyboardStep
                  : -keyboardStep),
            ),
          ),
        )
      }
    />
  );
}

function useResizeGestureHandlers({
  value,
  direction,
  onChange,
  onDragStateChange,
}: Pick<
  PanelResizeHandleProps,
  'value' | 'direction' | 'onChange' | 'onDragStateChange'
>): Pick<
  Parameters<typeof PanResponder.create>[0],
  | 'onPanResponderGrant'
  | 'onPanResponderRelease'
  | 'onPanResponderTerminate'
  | 'onPanResponderMove'
> {
  const startingWidth = useRef(value);
  const current = useRef({ value, direction, onChange, onDragStateChange });
  useLayoutEffect(() => {
    current.current = { value, direction, onChange, onDragStateChange };
  }, [value, direction, onChange, onDragStateChange]);
  const grant = useCallback(() => {
    startingWidth.current = current.current.value;
    current.current.onDragStateChange?.(true);
  }, []);
  const release = useCallback(
    () => current.current.onDragStateChange?.(false),
    [],
  );
  const move = useCallback(
    (_event: GestureResponderEvent, gesture: PanResponderGestureState) => {
      current.current.onChange(
        startingWidth.current + gesture.dx * current.current.direction,
      );
    },
    [],
  );
  return {
    onPanResponderGrant: grant,
    onPanResponderRelease: release,
    onPanResponderTerminate: release,
    onPanResponderMove: move,
  };
}

function useResizeResponder(
  props: Pick<
    PanelResizeHandleProps,
    'value' | 'direction' | 'onChange' | 'onDragStateChange'
  >,
): ReturnType<typeof PanResponder.create> {
  const handlers = useResizeGestureHandlers(props);
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      ...handlers,
    }),
  );
  return responder;
}
