import SliderPrimitive from '@react-native-community/slider';
import { View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import type { SliderProps } from './slider';

const emptyThumb = {
  uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
};
// A fixed size restores the drawn thumb after its transparent image is cleared.
const selectedThumbSize = 16;

export function Slider({
  valueLabel,
  accessibilityLabel,
  value,
  ...props
}: SliderProps) {
  const primary = useResolveClassNames('text-primary').color;
  const muted = useResolveClassNames('text-muted').color;
  const primaryColor = typeof primary === 'string' ? primary : '#171717';
  const mutedColor = typeof muted === 'string' ? muted : '#f5f5f5';
  const selected = value !== undefined;
  return (
    <SliderPrimitive
      {...props}
      value={value ?? props.minimumValue}
      onSlidingComplete={selected ? undefined : props.onValueChange}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: props.minimumValue,
        max: props.maximumValue,
        now: value,
        text: valueLabel,
      }}
      minimumTrackTintColor={selected ? primaryColor : mutedColor}
      maximumTrackTintColor={mutedColor}
      thumbTintColor={selected ? primaryColor : 'transparent'}
      thumbImage={selected ? undefined : emptyThumb}
      thumbSize={selected ? selectedThumbSize : undefined}
      StepMarker={({ index }) => (
        <View
          className="size-1 rounded-full bg-ring"
          style={{ opacity: index === value ? 0 : 1 }}
        />
      )}
      tapToSeek
      style={{ width: '100%', height: 32 }}
    />
  );
}
