import { Slider as NativeSlider } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from './host';
import type { SliderProps } from './slider';
import { type SliderRange, sliderStopCount } from './slider-steps';

type NativeSliderProps = React.ComponentProps<typeof NativeSlider>;

// Expo's universal Slider takes no colours on Android, so Argo keeps the Compose one to draw its tint.
export function Slider(props: SliderProps): React.JSX.Element {
  const colors = useSliderColors();
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <NativeSlider
        {...sliderAttributes(props)}
        colors={colors}
        modifiers={[semantics({ contentDescription: spokenName(props) })]}
      />
    </Host>
  );
}

// @expo/ui's semantics take no state description, so TalkBack hears the value label inside the name.
function spokenName(
  props: Pick<SliderProps, 'accessibilityLabel' | 'valueLabel'>,
): string {
  return `${props.accessibilityLabel}, ${props.valueLabel}`;
}

function useSliderColors(): NativeSliderProps['colors'] {
  const { tint, muted } = useNativeTheme().colors;
  return {
    thumbColor: tint,
    activeTrackColor: tint,
    inactiveTrackColor: muted,
    activeTickColor: muted,
    inactiveTickColor: tint,
  };
}

function sliderAttributes(props: SliderProps): NativeSliderProps {
  return {
    value: props.value ?? props.minimumValue,
    min: props.minimumValue,
    max: props.maximumValue,
    steps: Math.max(0, sliderStopCount(props) - 2),
    enabled: !props.disabled,
    onValueChange: (value) => props.onValueChange(snapToStep(value, props)),
  };
}

// Compose reports a stepped position as a float, so it is rounded onto the nearest stop.
function snapToStep(value: number, range: SliderRange): number {
  const stop = Math.round((value - range.minimumValue) / range.step);
  return range.minimumValue + stop * range.step;
}
