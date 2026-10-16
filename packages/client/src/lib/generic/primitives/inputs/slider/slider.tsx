import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import type { SliderProps } from './slider-props';

const fullPercent = 100;

const progressProperty = '--slider-progress';

/*
 * Expo's universal web Slider hard-codes its palette, so web keeps this range input for the thumb and the full-width hit area.
 * The input's own track is hidden: a range input runs its track under the thumb at each end, so Argo draws the track from the minimum's thumb centre to the maximum's.
 * The thumb and the drawn track's fill live in react-native-web.css (.slider-range, .slider-track): Tailwind has no variant for a range input's thumb.
 */
const rangeClass =
  'slider-range relative block m-0 h-5.5 w-full appearance-none bg-transparent cursor-pointer disabled:cursor-default focus-visible:outline-none';

// Inset by the thumb's radius, so each end of the track is where the thumb's centre stops.
const trackClass = 'slider-track absolute inset-x-2 top-2.25 h-1 rounded-full';

type SliderPosition = Pick<
  SliderProps,
  'value' | 'minimumValue' | 'maximumValue' | 'step'
>;

export function Slider(props: SliderProps): React.JSX.Element {
  return (
    <div className={cn('relative h-5.5', props.disabled && 'opacity-50')}>
      <SliderTrack {...props} />
      <input {...rangeAttributes(props)} {...rangeInteraction(props)} />
    </div>
  );
}

function SliderTrack(props: SliderPosition): React.JSX.Element {
  return <div className={trackClass} style={progressStyle(props)} />;
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
    className: rangeClasses(props.value === undefined),
  };
}

const rangeClasses = (unset: boolean): string =>
  cn(rangeClass, unset && 'slider-range-unset');

function progressStyle(
  props: SliderPosition,
): React.CSSProperties & Record<typeof progressProperty, string> {
  const progress =
    props.value === undefined ? 0 : fraction(props.value, props) * fullPercent;

  return { [progressProperty]: `${progress}%` };
}

function fraction(
  value: number,
  range: Pick<SliderProps, 'minimumValue' | 'maximumValue'>,
): number {
  return (
    (value - range.minimumValue) / (range.maximumValue - range.minimumValue)
  );
}

export type { SliderProps } from './slider-props';

Slider satisfies React.ComponentType<SliderProps>;
