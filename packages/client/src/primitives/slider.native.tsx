import SliderPrimitive from '@react-native-community/slider';
import { View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import type { SliderProps } from './slider';

export function Slider({
  valueLabel,
  accessibilityLabel,
  ...props
}: SliderProps) {
  const primary = useResolveClassNames('text-primary').color;
  const muted = useResolveClassNames('text-muted').color;
  return (
    <SliderPrimitive
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: props.minimumValue,
        max: props.maximumValue,
        now: props.value,
        text: valueLabel,
      }}
      minimumTrackTintColor={typeof primary === 'string' ? primary : '#171717'}
      maximumTrackTintColor={typeof muted === 'string' ? muted : '#f5f5f5'}
      thumbTintColor={typeof primary === 'string' ? primary : '#171717'}
      StepMarker={({ index }) => (
        <View
          className="size-1 rounded-full bg-ring"
          style={{ opacity: index === props.value ? 0 : 1 }}
        />
      )}
      tapToSeek
      style={{ width: '100%', height: 32 }}
    />
  );
}
