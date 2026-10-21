import type { AudioTransportProps } from './audio-transport';

type AudioTransportFixture = Omit<AudioTransportProps, 'onToggle' | 'onSeek'>;

export const playingAudioTransport = {
  label: 'Chime',
  phase: 'playing',
  currentTime: 47,
  duration: 192,
} satisfies AudioTransportFixture;

export const loadingAudioTransport = {
  label: 'Chime',
  phase: 'loading',
  currentTime: 0,
  duration: 0,
} satisfies AudioTransportFixture;
