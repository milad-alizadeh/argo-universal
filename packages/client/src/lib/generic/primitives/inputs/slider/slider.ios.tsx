import { Slider as UniversalSlider } from '@expo/ui';
import {
  accessibilityLabel,
  accessibilityValue,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { ControlHost } from '#primitives/native/native-control';
import { optionalTint } from '#primitives/native/native-modifiers';
import type { SliderProps } from './slider-props';

export function Slider(props: SliderProps): React.JSX.Element {
  const modifiers = useSliderModifiers(props);

  return (
    <ControlHost matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <UniversalSlider
        {...sliderRange(props)}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
        modifiers={modifiers}
      />
    </ControlHost>
  );
}

function sliderRange(
  props: SliderProps,
): Pick<
  React.ComponentProps<typeof UniversalSlider>,
  'value' | 'min' | 'max' | 'step'
> {
  return {
    value: props.value ?? props.minimumValue,
    min: props.minimumValue,
    max: props.maximumValue,
    step: props.step,
  };
}

function useSliderModifiers(
  props: Pick<SliderProps, 'accessibilityLabel' | 'valueLabel'>,
): React.ComponentProps<typeof UniversalSlider>['modifiers'] {
  const { accent } = useNativeTheme().colors;

  return [
    accessibilityLabel(props.accessibilityLabel),
    accessibilityValue(props.valueLabel),
    ...optionalTint(accent),
  ];
}

export type { SliderProps } from './slider-props';

Slider satisfies React.ComponentType<SliderProps>;
