import type { VoiceStatus } from '@repo/contracts';

// Whether the Composer offers the voice button: Voice calls are on and the Voice provider can start one.
export const voiceOffered = (status: VoiceStatus): boolean =>
  status.enabled && status.availability.usable;
