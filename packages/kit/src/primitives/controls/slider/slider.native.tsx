import { Slider as UniversalSlider } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityLabel,
  accessibilityValue,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { ControlHost } from '#primitives/native/native-control';
import type { SliderProps } from './slider-props';

type UniversalSliderProps = React.ComponentProps<typeof UniversalSlider>;

const noop = (): void => undefined;

export function Slider(props: SliderProps): React.JSX.Element {
  return (
    <ControlHost matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <UniversalSlider
        {...sliderRange(props)}
        disabled={props.disabled}
        onValueChange={props.onValueChange ?? noop}
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

// Stock Compose semantics only take a content description, so TalkBack hears the name and readable value together.
function sliderModifiers(
  props: Pick<SliderProps, 'accessibilityLabel' | 'valueLabel' | 'fill'>,
): UniversalSliderProps['modifiers'] {
  if (Platform.OS === 'android')
    return [
      semantics({
        contentDescription: `${props.accessibilityLabel}, ${props.valueLabel}`,
      }),
    ];

  // SwiftUI's slider takes one colour, so a fill draws as its first stop (ADR-0026, Colour as data).
  const [first] = props.fill ?? [];

  return [
    accessibilityLabel(props.accessibilityLabel),
    accessibilityValue(props.valueLabel),
    ...(first === undefined ? [] : [tint(first)]),
  ];
}

export type { SliderProps } from './slider-props';

Slider satisfies React.ComponentType<SliderProps>;
