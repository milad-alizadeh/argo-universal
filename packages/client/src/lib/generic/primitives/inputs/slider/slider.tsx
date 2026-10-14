import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import type { SliderProps } from './slider-props';

const fullPercent = 100;

const progressProperty = '--slider-progress';

/*
 * Expo's universal web Slider hard-codes its palette, so web keeps this range input for the thumb and the full-width hit area.
 * The input's own track is hidden: a range input runs its track under the thumb at each end, so Argo draws the track from the minimum's thumb centre to the maximum's.
 */
const rangeClass =
  'relative block m-0 h-5.5 w-full appearance-none bg-transparent cursor-pointer disabled:cursor-default focus-visible:outline-none';

const webkitTrackClass =
  '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent';

const webkitThumbClass =
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:transition-[scale,box-shadow] [&::-webkit-slider-thumb]:duration-100';

const webkitThumbStateClass =
  'enabled:hover:[&::-webkit-slider-thumb]:scale-110 enabled:active:[&::-webkit-slider-thumb]:scale-115 enabled:active:[&::-webkit-slider-thumb]:shadow-[0_0_0_6px_color-mix(in_oklab,var(--color-primary)_18%,transparent)] focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_50%,transparent)]';

const mozClass =
  '[&::-moz-range-track]:bg-transparent [&::-moz-range-progress]:bg-transparent [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-ring)_50%,transparent)]';

const unsetClass =
  '[&::-webkit-slider-thumb]:opacity-0 [&::-moz-range-thumb]:opacity-0';

// Inset by the thumb's radius, so each end of the track is where the thumb's centre stops.
const trackClass =
  'absolute inset-x-2 top-2.25 h-1 rounded-full bg-[linear-gradient(to_right,var(--color-primary)_var(--slider-progress),var(--color-separator)_var(--slider-progress))]';

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
  cn(
    rangeClass,
    webkitTrackClass,
    webkitThumbClass,
    webkitThumbStateClass,
    mozClass,
    unset && unsetClass,
  );

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
