import type { Slider } from '@expo/ui';
import type { ComponentProps } from 'react';
import type { FieldGroupKitProps } from '../../kit-props';

// What the row passes on to Expo UI's universal Slider.
export const sliderProps = (
  props: FieldGroupKitProps<'FieldGroup.Slider'>,
): ComponentProps<typeof Slider> => ({
  value: props.value,
  min: props.min,
  max: props.max,
  step: props.step,
  disabled: props.disabled,
  onValueChange: props.onValueChange,
});
