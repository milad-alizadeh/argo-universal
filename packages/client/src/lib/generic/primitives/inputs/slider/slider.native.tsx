import { Slider as UniversalSlider } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityLabel,
  accessibilityValue,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { ControlHost } from '#primitives/native/native-control';
import type { SliderProps } from './slider-props';

type UniversalSliderProps = React.ComponentProps<typeof UniversalSlider>;

export function Slider(props: SliderProps): React.JSX.Element {
  return (
    <ControlHost matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <UniversalSlider
        {...sliderRange(props)}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
        modifiers={sliderModifiers(props)}
      />
    </ControlHost>
  );
}

function sliderRange(
  props: SliderProps,
): Pick<UniversalSliderProps, 'value' | 'min' | 'max' | 'step'> {
  return {
    value: props.value ?? props.minimumValue,
    min: props.minimumValue,
    max: props.maximumValue,
    step: props.step,
  };
}

// TalkBack names seek controls from semantic text, separately from their value.
function sliderModifiers(
  props: Pick<SliderProps, 'accessibilityLabel' | 'valueLabel'>,
): UniversalSliderProps['modifiers'] {
  if (Platform.OS === 'android')
    return [
      semantics({
        text: props.accessibilityLabel,
        stateDescription: props.valueLabel,
      }),
    ];

  return [
    accessibilityLabel(props.accessibilityLabel),
    accessibilityValue(props.valueLabel),
  ];
}

export type { SliderProps } from './slider-props';

Slider satisfies React.ComponentType<SliderProps>;
