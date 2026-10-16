// The universal Slider hides Compose's public colour props; keep Material's range control and drawing.
import { Slider as MaterialSlider } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { ControlHost } from '#primitives/native/native-control';
import type { SliderProps } from './slider-props';

export function Slider(props: SliderProps): ReactElement {
  return (
    <ControlHost matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <MaterialSlider {...controlProps(props)} colors={useSliderColors()} />
    </ControlHost>
  );
}

function controlProps(
  props: SliderProps,
): React.ComponentProps<typeof MaterialSlider> {
  return {
    ...rangeProps(props),
    enabled: !props.disabled,
    onValueChange: changeHandler(props),
    modifiers: [
      semantics({
        contentDescription: `${props.accessibilityLabel}, ${props.valueLabel}`,
      }),
    ],
  };
}

function changeHandler(
  props: SliderProps,
): React.ComponentProps<typeof MaterialSlider>['onValueChange'] {
  if (props.disabled) return undefined;

  return (value) => props.onValueChange(selectedStep(props, value));
}

function rangeProps(
  props: SliderProps,
): Pick<
  React.ComponentProps<typeof MaterialSlider>,
  'value' | 'min' | 'max' | 'steps'
> {
  return {
    value: props.value ?? props.minimumValue,
    min: props.minimumValue,
    max: props.maximumValue,
    steps: rangeSteps(props),
  };
}

// Material counts the stops between the ends; Argo's step is the increment between values.
function rangeSteps(props: SliderProps): number {
  if (props.step <= 0) return 0;

  return Math.max(
    0,
    Math.round((props.maximumValue - props.minimumValue) / props.step) - 1,
  );
}

function selectedStep(props: SliderProps, value: number): number {
  if (props.step <= 0) return value;

  return (
    Math.round((value - props.minimumValue) / props.step) * props.step +
    props.minimumValue
  );
}

function useSliderColors(): React.ComponentProps<
  typeof MaterialSlider
>['colors'] {
  const colors = useNativeTheme().colors;

  return {
    thumbColor: colors.primary,
    activeTrackColor: colors.primary,
    inactiveTrackColor: colors.border,
    activeTickColor: colors.primaryForeground,
    inactiveTickColor: colors.primary,
  };
}

export type { SliderProps } from './slider-props';
