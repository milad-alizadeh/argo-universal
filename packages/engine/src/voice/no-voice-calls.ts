import type { VoiceStatus } from '@repo/contracts';
import { unavailable, type VoiceCallsPort } from './voice-calls';

const notAvailable = 'Voice calls are not available';

const noStatus: VoiceStatus = {
  call: null,
  ended: null,
  availability: { usable: false, reason: notAvailable },
  enabled: true,
};

// What the Server runs with when it was given no Voice call machine: a Voice call can never start.
export const noVoiceCalls: VoiceCallsPort = {
  status: () => Promise.resolve(noStatus),
  start: () => Promise.reject(unavailable(notAvailable)),
  end: () => ({ ended: false }),
  attach: () => {},
  settings: () =>
    Promise.resolve({
      enabled: true,
      provider: null,
      voice: null,
      providers: [],
      voices: [],
    }),
  changeSettings: () => Promise.reject(unavailable(notAvailable)),
  watch: async function* () {
    await Promise.resolve();
    yield noStatus;
  },
};
