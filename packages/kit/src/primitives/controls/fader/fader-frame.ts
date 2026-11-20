import { faderDefaults } from '@repo/contracts/kit-tokens';
import { useState } from 'react';
import type { ViewProps } from 'react-native';
import { useFaderDrag } from './fader-drag';
import type { DragSource } from './fader-drag-tracker';
import type { FaderProps } from './fader-props';
import { useFaderValue, type FaderValue } from './fader-value';

export interface FaderState {
  orientation: NonNullable<FaderProps['orientation']>;
  control: FaderValue;
  // What the frame listens to: its own size, and the drag.
  frame: ViewProps;
}

const unmeasured = { width: 0, height: 0 };

const sourceOf = (
  props: FaderProps,
  state: Pick<FaderState, 'orientation' | 'control'>,
  size: DragSource['size'],
): DragSource => ({
  orientation: state.orientation,
  disabled: props.disabled ?? false,
  range: props,
  value: state.control.value,
  size,
  onDrag: state.control.set,
});

// Everything a Fader holds besides its drawing: its direction, its value and what it listens to.
export function useFader(props: FaderProps): FaderState {
  const orientation = props.orientation ?? faderDefaults.orientation;
  const control = useFaderValue(props);
  const [size, setSize] = useState(unmeasured);
  const drag = useFaderDrag(sourceOf(props, { orientation, control }, size));

  const onLayout: ViewProps['onLayout'] = (event) =>
    setSize(event.nativeEvent.layout);

  return { orientation, control, frame: { ...drag, onLayout } };
}
