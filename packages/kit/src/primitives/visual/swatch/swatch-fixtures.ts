import type { SwatchProps } from './swatch';

export const solidSwatch = {
  colors: ['#FFB45A'],
  accessibilityLabel: 'Warm',
} satisfies SwatchProps;

export const gradientSwatch = {
  colors: ['#FFB45A', '#FF4FA0', '#7A5CFF'],
  accessibilityLabel: 'Colour cycle',
} satisfies SwatchProps;

export const emptySwatch = {
  accessibilityLabel: 'Off',
} satisfies SwatchProps;
