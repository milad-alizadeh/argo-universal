import type { VoiceStatus } from '@repo/contracts';
import { unavailable } from './unavailable';
import type { VoiceCallsPort } from './voice-calls';

const noStatus: VoiceStatus = {
  call: null,
  ended: null,
  availability: { usable: false, reason: 'Voice calls are not available' },
};

// What the Server runs with when it was given no Voice call machine: a Voice call can never start.
export const noVoiceCalls: VoiceCallsPort = {
  status: () => Promise.resolve(noStatus),
  start: () => Promise.reject(unavailable('Voice calls are not available')),
  end: () => ({ ended: false }),
  hangUp: () => {
    throw unavailable('The Session has no Voice call');
  },
  attach: () => {},
  watch: async function* () {
    await Promise.resolve();
    yield noStatus;
  },
};
