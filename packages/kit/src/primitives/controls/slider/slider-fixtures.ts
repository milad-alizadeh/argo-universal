import type { SliderProps } from './slider-props';

type SliderFixture = Omit<SliderProps, 'onValueChange'>;

const speeds = {
  minimumValue: 0.5,
  maximumValue: 2,
  step: 0.5,
  accessibilityLabel: 'Speech speed',
  valueLabel: 'None',
};

const efforts = { ...speeds, minimumValue: 0, maximumValue: 5, step: 1 };

export const defaultSlider = { ...speeds, value: 1 } satisfies SliderFixture;

export const minimumSlider = { ...speeds, value: 0.5 } satisfies SliderFixture;

export const maximumSlider = { ...speeds, value: 2 } satisfies SliderFixture;

export const sixStopsSlider = { ...efforts, value: 2 } satisfies SliderFixture;

export const noSelectionSlider = efforts satisfies SliderFixture;

export const disabledSlider = {
  ...speeds,
  value: 1,
  disabled: true,
} satisfies SliderFixture;

// The effort row's slider, which the ListItem Control story draws.
export const effortSlider = {
  accessibilityLabel: 'Effort',
  valueLabel: 'High',
  minimumValue: 0,
  maximumValue: 3,
  step: 1,
  value: 2,
} satisfies SliderFixture;

// The fill is data, such as a light's colours; the label's words stand for its own value.
export const solidFillSlider = {
  ...speeds,
  value: 1,
  fill: ['#FFB45A'],
} satisfies SliderFixture;

export const gradientFillSlider = {
  ...speeds,
  value: 1.5,
  fill: ['#FFB45A', '#FF4FA0', '#7A5CFF'],
} satisfies SliderFixture;
