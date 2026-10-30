import type { VideoProps } from './video-props';

const hash = 'a'.repeat(64);

const source = { pluginId: 'example', hash, format: 'mp4' } as const;

const poster = { pluginId: 'example', hash, format: 'jpeg' } as const;

export const stillFrameVideo = {
  source,
  accessibilityLabel: 'Demo clip',
  poster,
} satisfies VideoProps;

export const autoplayVideo = {
  source,
  aspect: 'square',
  autoPlay: true,
  accessibilityLabel: 'Loop',
} satisfies VideoProps;

export const failedVideo = {
  source,
  accessibilityLabel: 'Demo clip',
} satisfies VideoProps;
