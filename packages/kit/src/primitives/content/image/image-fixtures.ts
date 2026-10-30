import type { ImageProps } from './image';

const asset = {
  pluginId: 'example',
  hash: 'a'.repeat(64),
  format: 'jpeg',
} as const;

export const loadedImage = {
  source: asset,
  aspect: 4 / 3,
  radius: 'container',
  accessibilityLabel: 'Screenshot',
} satisfies ImageProps;

export const containImage = {
  source: asset,
  aspect: 1,
  fit: 'contain',
  radius: 'control',
  accessibilityLabel: 'Full screenshot',
} satisfies ImageProps;

export const loadingImage = {
  aspect: 16 / 9,
  radius: 'container',
  accessibilityLabel: 'Loading screenshot',
} satisfies ImageProps;

export const failedImage = {
  source: asset,
  accessibilityLabel: 'Missing screenshot',
} satisfies ImageProps;
