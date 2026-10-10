import SliderPrimitive from '@react-native-community/slider';
import { View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import type { SliderProps } from './slider';

const emptyThumb = {
  uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
};
const selectedThumbSize = 16;
const unselectedThumbSize = 1;

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
  const steps =
    Math.round((props.maximumValue - props.minimumValue) / props.step) + 1;
  return (
    <View className="relative justify-center">
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
        thumbSize={selected ? selectedThumbSize : unselectedThumbSize}
        tapToSeek
        style={{ width: '100%', height: 32 }}
      />
      {/* Slider 5.2 discards the native thumbImage when StepMarker is provided. */}
      <View
        pointerEvents="none"
        className="absolute z-10 flex-row justify-between"
        style={{ left: '5%', right: '5%' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length: steps }, (_, index) => (
          <View
            key={index}
            className="size-1 rounded-full bg-ring"
            style={{
              opacity:
                props.minimumValue + index * props.step === value ? 0 : 1,
            }}
          />
        ))}
      </View>
    </View>
  );
}
