import { useRef } from 'react';
import { PanResponder, View } from 'react-native';

export interface PanelResizeHandleProps {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  direction: 1 | -1;
  onChange: (width: number) => void;
}

export function PanelResizeHandle({
  label,
  value,
  minimum,
  maximum,
  direction,
  onChange,
}: PanelResizeHandleProps) {
  const startingWidth = useRef(value);
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startingWidth.current = value;
    },
    onPanResponderMove: (_event, gesture) =>
      onChange(
        Math.max(
          minimum,
          Math.min(maximum, startingWidth.current + gesture.dx * direction),
        ),
      ),
  });
  return (
    <View
      {...responder.panHandlers}
      className="absolute -right-1 bottom-0 top-shell-header z-10 w-2"
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
              value + (nativeEvent.actionName === 'increment' ? 16 : -16),
            ),
          ),
        )
      }
    />
  );
}
