import { Column, Slider } from '@expo/ui';
import {
  accessibilityLabel,
  accessibilityValue,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import type { FieldGroupKitProps } from '../../kit-props';
import { SliderHeader } from './field-slider-header';
import { sliderProps, spokenValue } from './field-slider-props';

type Props = FieldGroupKitProps<'FieldGroup.Slider'>;

// SwiftUI announces the title as the slider's name and the value's words as its value.
const spokenModifiers = (
  props: Props,
): ReturnType<typeof accessibilityLabel>[] => [
  accessibilityLabel(props.title),
  accessibilityValue(spokenValue(props)),
];

/*
 * The title and the value's words over Expo UI's universal Slider; no leading icon. The slider is named by the title
 * and announces the value's words, as a stock SwiftUI slider with a label does.
 */
export function FieldSlider(
  props: FieldGroupKitProps<'FieldGroup.Slider'>,
): ReactElement {
  return (
    <Column>
      <SliderHeader {...props} />
      <Slider {...sliderProps(props, spokenModifiers(props))} />
    </Column>
  );
}
