import { Column, Slider } from '@expo/ui';
import type { ComponentProps, ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldGroupKitProps } from '../../kit-props';

// The title over Expo UI's universal Slider on every platform; no leading icon.
export function FieldSlider(
  props: FieldGroupKitProps<'FieldGroup.Slider'>,
): ReactElement {
  return (
    <Column>
      <NativeText>{props.title}</NativeText>
      <Slider {...sliderProps(props)} />
    </Column>
  );
}

const sliderProps = (
  props: FieldGroupKitProps<'FieldGroup.Slider'>,
): ComponentProps<typeof Slider> => ({
  value: props.value,
  min: props.min,
  max: props.max,
  step: props.step,
  disabled: props.disabled,
  onValueChange: props.onValueChange,
});
