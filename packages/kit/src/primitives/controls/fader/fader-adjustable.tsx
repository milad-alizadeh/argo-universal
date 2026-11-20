import type { ReactElement } from 'react';
import {
  type AccessibilityActionEvent,
  View,
  type ViewProps,
} from 'react-native';
import type { FaderProps } from './fader-props';
import type { FaderValue } from './fader-value';

const actions = [{ name: 'increment' }, { name: 'decrement' }];

// What a screen reader announces: a slider named by its label, reading its value label.
const announced = (props: FaderProps, now: number): ViewProps => ({
  role: 'slider',
  'aria-label': props.accessibilityLabel,
  'aria-valuemin': props.minimumValue,
  'aria-valuemax': props.maximumValue,
  'aria-valuenow': now,
  'aria-valuetext': props.valueLabel,
  'aria-disabled': props.disabled,
});

const direction = (event: AccessibilityActionEvent): 1 | -1 =>
  event.nativeEvent.actionName === 'increment' ? 1 : -1;

// How it is adjusted: a screen reader's actions, and the keyboard's focus stop and keys.
const adjusted = (props: FaderProps, control: FaderValue): ViewProps => ({
  accessibilityActions: actions,
  onAccessibilityAction: (event) => control.nudge(direction(event)),
  focusable: !props.disabled,
  tabIndex: props.disabled ? undefined : 0,
  onKeyDown: (event) => {
    if (control.onKey(event.nativeEvent.key)) event.preventDefault();
  },
});

// The one element a screen reader and the keyboard adjust; the content over it keeps its own.
export function Adjustable(
  props: FaderProps & { control: FaderValue },
): ReactElement {
  return (
    <View
      accessible
      {...announced(props, props.control.value)}
      {...adjusted(props, props.control)}
      className="absolute inset-0 focus-visible:focus-ring"
    />
  );
}
