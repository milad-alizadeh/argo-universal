import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { sliderStops } from './slider-steps';

const fullPercent = 100;
const sliderClass =
  'm-0 h-1 w-full appearance-none rounded-full cursor-pointer disabled:opacity-50 focus-visible:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background';

export interface SliderProps {
  value?: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
  valueLabel: string;
  disabled?: boolean;
}

export function Slider(props: SliderProps): React.JSX.Element {
  return (
    <View className="relative h-4 justify-center">
      <input {...rangeAttributes(props)} {...rangeInteraction(props)} />
      <View
        pointerEvents="none"
        className="absolute left-1.5 right-1.5 flex-row justify-between"
      >
        {sliderStops(props).map((stop) => (
          <SliderStop key={stop} stop={stop} value={props.value} />
        ))}
      </View>
    </View>
  );
}

function rangeAttributes(
  props: SliderProps,
): React.InputHTMLAttributes<HTMLInputElement> {
  return {
    type: 'range',
    min: props.minimumValue,
    max: props.maximumValue,
    step: props.step,
    value: props.value ?? props.minimumValue,
    disabled: props.disabled,
    'aria-label': props.accessibilityLabel,
    'aria-valuetext': props.valueLabel,
  };
}

function rangeInteraction(
  props: SliderProps,
): React.InputHTMLAttributes<HTMLInputElement> {
  return {
    onPointerUp: (event) => {
      if (props.value === undefined)
        props.onValueChange(Number(event.currentTarget.value));
    },
    onChange: (event) => props.onValueChange(Number(event.currentTarget.value)),
    className: rangeClass(props.value),
    style: { background: sliderBackground(props) },
  };
}

function sliderBackground(
  props: Pick<SliderProps, 'value' | 'minimumValue' | 'maximumValue'>,
): string {
  if (props.value === undefined) return 'var(--color-muted)';
  const progress =
    ((props.value - props.minimumValue) /
      (props.maximumValue - props.minimumValue)) *
    fullPercent;
  return `linear-gradient(to right, var(--color-primary) ${progress}%, var(--color-muted) ${progress}%)`;
}

function SliderStop({
  stop,
  value,
}: {
  stop: number;
  value: number | undefined;
}): React.JSX.Element {
  const className = stopClass(stop, value);
  return (
    <View className={className} style={{ opacity: stop === value ? 0 : 1 }} />
  );
}

function rangeClass(value: number | undefined): string {
  return cn(
    sliderClass,
    value === undefined &&
      '[&::-webkit-slider-thumb]:opacity-0 [&::-moz-range-thumb]:opacity-0',
  );
}

function stopClass(stop: number, value: number | undefined): string {
  return value !== undefined && stop < value
    ? 'size-1 rounded-full bg-primary-foreground'
    : 'size-1 rounded-full bg-ring';
}
