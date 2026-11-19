import type { VoiceStatus } from '@repo/contracts';
import { unavailable } from './unavailable';
import type { VoiceCallsPort } from './voice-calls';
import { settingsOf } from './voice-choices';
import { defaultVoiceSettings } from './voice-settings';

const notAvailable = 'Voice calls are not available';

const noStatus: VoiceStatus = {
  call: null,
  ended: null,
  partials: [],
  availability: { usable: false, reason: notAvailable },
  enabled: defaultVoiceSettings.enabled,
  volume: defaultVoiceSettings.options.volume,
  microphoneGain: defaultVoiceSettings.options.microphoneGain,
};

const refused = (): Promise<never> => Promise.reject(unavailable(notAvailable));

// What the Server runs with when it was given no Voice call machine: a Voice call can never start.
export const noVoiceCalls: VoiceCallsPort = {
  status: () => Promise.resolve(noStatus),
  start: () => Promise.reject(unavailable(notAvailable)),
  end: () => ({ ended: false }),
  hangUp: () => {
    throw unavailable('The Session has no Voice call');
  },
  attach: () => {},
  choices: {
    settings: () => settingsOf(defaultVoiceSettings, null),
    change: refused,
    voices: () => Promise.resolve({ voices: [] }),
    saveCustomVoice: refused,
    deleteCustomVoice: refused,
    setInstructions: refused,
    setCallOptions: refused,
  },
  preview: () => Promise.reject(unavailable(notAvailable)),
  watch: async function* () {
    await Promise.resolve();
    yield noStatus;
  },
};
