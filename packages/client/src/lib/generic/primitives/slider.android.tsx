import { Slider as NativeSlider } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from './host';
import type { SliderProps } from './slider';
import { sliderStopCount } from './slider-steps';

export function Slider(props: SliderProps): React.JSX.Element {
  const colors = useSliderColors();
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <NativeSlider {...sliderAttributes(props)} colors={colors} />
    </Host>
  );
}

function useSliderColors(): React.ComponentProps<
  typeof NativeSlider
>['colors'] {
  const { tint, muted } = useNativeTheme().colors;
  return {
    thumbColor: tint,
    activeTrackColor: tint,
    inactiveTrackColor: muted,
    activeTickColor: muted,
    inactiveTickColor: tint,
  };
}

function sliderAttributes(
  props: SliderProps,
): React.ComponentProps<typeof NativeSlider> {
  return {
    value: props.value ?? props.minimumValue,
    min: props.minimumValue,
    max: props.maximumValue,
    steps: Math.max(0, sliderStopCount(props) - 2),
    onValueChange: props.onValueChange,
  };
}
