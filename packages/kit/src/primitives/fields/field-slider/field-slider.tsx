import { Column, Slider } from '@expo/ui';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldGroupKitProps } from '../../kit-props';
import { sliderProps } from './field-slider-props';

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
