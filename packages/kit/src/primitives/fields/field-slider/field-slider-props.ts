import type { Slider } from '@expo/ui';
import type { ComponentProps } from 'react';
import type { FieldGroupKitProps } from '../../kit-props';

type SliderRowProps = FieldGroupKitProps<'FieldGroup.Slider'>;

// What the row passes on to Expo UI's universal Slider.
export const sliderProps = (
  props: SliderRowProps,
  modifiers?: ComponentProps<typeof Slider>['modifiers'],
): ComponentProps<typeof Slider> => ({
  value: props.value,
  min: props.min,
  max: props.max,
  step: props.step,
  disabled: props.disabled,
  onValueChange: props.onValueChange,
  modifiers,
});

// The value in words where the caller gave them; the number otherwise.
export const spokenValue = (props: SliderRowProps): string =>
  props.valueLabel ?? String(props.value);
