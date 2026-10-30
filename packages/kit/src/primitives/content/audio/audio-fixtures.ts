import type { AudioProps } from './audio-props';

const chime = {
  pluginId: 'example',
  hash: 'a'.repeat(64),
  format: 'mp3',
} as const;

export const pausedAudio = {
  source: chime,
  accessibilityLabel: 'Chime',
} satisfies AudioProps;
