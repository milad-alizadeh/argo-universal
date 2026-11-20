import type { ConversationStatus } from '@repo/contracts';
import { ConversationDevices } from './conversation-devices';
import { defaultConversationSettings } from './conversation-settings';
import type { ConversationsPort } from './conversations';
import { noConversation, unavailable } from './unavailable';
import { settingsOf } from './voice-choices';

const notAvailable = 'Conversations are not available';

const noStatus: ConversationStatus = {
  conversation: null,
  ended: null,
  partials: [],
  availability: { usable: false, reason: notAvailable },
  enabled: defaultConversationSettings.enabled,
  volume: defaultConversationSettings.options.volume,
  microphoneGain: defaultConversationSettings.options.microphoneGain,
};

const refused = (): Promise<never> => Promise.reject(unavailable(notAvailable));

// What the Server runs with when it was given no Conversation machine: a Conversation can never start.
export const noConversations: ConversationsPort = {
  status: () => Promise.resolve(noStatus),
  start: () => Promise.reject(unavailable(notAvailable)),
  end: () => ({ ended: false }),
  hangUp: () => {
    throw noConversation();
  },
  attach: () => {},
  choices: {
    settings: () => settingsOf(defaultConversationSettings, null),
    change: refused,
    voices: () => Promise.resolve({ voices: [] }),
    saveCustomVoice: refused,
    deleteCustomVoice: refused,
    setInstructions: refused,
    setCallOptions: refused,
  },
  devices: new ConversationDevices(() => null),
  preview: () => Promise.reject(unavailable(notAvailable)),
  previewClips: {
    get: () => Promise.resolve({ clip: null }),
    store: refused,
  },
  watch: async function* () {
    await Promise.resolve();
    yield noStatus;
  },
};
