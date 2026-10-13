import type * as React from 'react';
import type { AccessibilityActionEvent, ViewProps } from 'react-native';
import { View } from 'react-native';
import { edgeClassName, keyboardStep } from './panel-resize-edge';
import { useResizeResponder } from './use-resize-responder';

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

const stepActions = [{ name: 'increment' }, { name: 'decrement' }];

function steppedWidth(
  { value, minimum, maximum }: PanelResizeHandleProps,
  { nativeEvent }: AccessibilityActionEvent,
): number {
  const step =
    nativeEvent.actionName === 'increment' ? keyboardStep : -keyboardStep;
  return Math.max(minimum, Math.min(maximum, value + step));
}

function adjustableProps(props: PanelResizeHandleProps): ViewProps {
  return {
    accessible: true,
    accessibilityLabel: props.label,
    accessibilityRole: 'adjustable',
    accessibilityValue: {
      min: props.minimum,
      max: props.maximum,
      now: props.value,
    },
    accessibilityActions: stepActions,
    onAccessibilityAction: (event) =>
      props.onChange(steppedWidth(props, event)),
  };
}

export function PanelResizeHandle(
  props: PanelResizeHandleProps,
): React.JSX.Element {
  const responder = useResizeResponder(props);
  return (
    <View
      {...responder.panHandlers}
      className={edgeClassName(props.edge)}
      {...adjustableProps(props)}
    />
  );
}
