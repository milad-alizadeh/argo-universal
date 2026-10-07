import { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';

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
}: PanelResizeHandleProps) {
  const startingWidth = useRef(value);
  const current = useRef({ value, direction, onChange, onDragStateChange });
  current.current = { value, direction, onChange, onDragStateChange };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startingWidth.current = current.current.value;
          current.current.onDragStateChange?.(true);
        },
        onPanResponderRelease: () => current.current.onDragStateChange?.(false),
        onPanResponderTerminate: () =>
          current.current.onDragStateChange?.(false),
        onPanResponderMove: (_event, gesture) =>
          current.current.onChange(
            startingWidth.current + gesture.dx * current.current.direction,
          ),
      }),
    [],
  );
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
