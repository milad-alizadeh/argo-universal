import type { VoiceWork } from './conversation-work';

export const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const statusOf = (
  work: VoiceWork,
): ReturnType<VoiceWork['host']['caller']['voice']['status']> =>
  work.host.caller.voice.status();
