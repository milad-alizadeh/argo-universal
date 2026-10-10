import SliderPrimitive from '@react-native-community/slider';
import type * as React from 'react';
import { View } from 'react-native';
import { usePrimitiveColor } from './primitive-color';
import type { SliderProps } from './slider';
import { sliderStops } from './slider-steps';

const emptyThumb = {
  uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
};
const selectedThumbSize = 16;
const unselectedThumbSize = 1;

export function Slider(props: SliderProps): React.JSX.Element {
  return (
    <View className="relative justify-center">
      <SliderControl {...props} />
      <SliderTicks {...props} />
    </View>
  );
}

type NativeSliderProps = React.ComponentProps<typeof SliderPrimitive>;
type SliderColors = Pick<
  NativeSliderProps,
  'minimumTrackTintColor' | 'maximumTrackTintColor' | 'thumbTintColor'
>;
type SliderThumb = Pick<
  NativeSliderProps,
  'onSlidingComplete' | 'thumbImage' | 'thumbSize'
>;

function SliderControl(props: SliderProps): React.JSX.Element {
  const colors = useSliderColors(props.value);
  const attributes = sliderAttributes(props);
  return (
    <SliderPrimitive
      {...attributes}
      {...colors}
      {...sliderThumb(props.value, props.onValueChange)}
      tapToSeek
      style={{ width: '100%', height: 32 }}
    />
  );
}

function sliderAttributes(props: SliderProps): NativeSliderProps {
  const { valueLabel, value, ...control } = props;
  return {
    ...control,
    value: value ?? props.minimumValue,
    accessibilityValue: {
      min: props.minimumValue,
      max: props.maximumValue,
      now: value,
      text: valueLabel,
    },
  };
}

function useSliderColors(value: number | undefined): SliderColors {
  const primary = useSliderColor('text-primary', '#171717');
  const muted = useSliderColor('text-muted', '#f5f5f5');
  return {
    minimumTrackTintColor: value === undefined ? muted : primary,
    maximumTrackTintColor: muted,
    thumbTintColor: value === undefined ? 'transparent' : primary,
  };
}

const unselectedThumb = {
  thumbImage: emptyThumb,
  thumbSize: unselectedThumbSize,
};
const selectedThumb = {
  onSlidingComplete: undefined,
  thumbImage: undefined,
  thumbSize: selectedThumbSize,
};

function sliderThumb(
  value: number | undefined,
  onValueChange: SliderProps['onValueChange'],
): SliderThumb {
  return value === undefined
    ? { ...unselectedThumb, onSlidingComplete: onValueChange }
    : selectedThumb;
}

function SliderTicks(
  props: Pick<SliderProps, 'minimumValue' | 'maximumValue' | 'step' | 'value'>,
): React.JSX.Element {
  return (
    <View {...tickOverlayProps}>
      {sliderStops(props).map((stop) => (
        <NativeSliderStop key={stop} stop={stop} value={props.value} />
      ))}
    </View>
  );
}

function NativeSliderStop({
  stop,
  value,
}: {
  stop: number;
  value: number | undefined;
}): React.JSX.Element {
  return (
    <View
      className="size-1 rounded-full bg-ring"
      style={{ opacity: stop === value ? 0 : 1 }}
    />
  );
}

function useSliderColor(className: string, fallback: string): string {
  return usePrimitiveColor(className) ?? fallback;
}

const tickOverlayProps = {
  pointerEvents: 'none',
  className: 'absolute z-10 flex-row justify-between',
  style: { left: '5%', right: '5%' },
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} satisfies React.ComponentProps<typeof View>;
