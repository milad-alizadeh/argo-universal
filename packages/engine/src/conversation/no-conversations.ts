import type { ConversationStatus, ConversationUpdate } from '@repo/contracts';
import { ConversationDevices } from './conversation-devices';
import { defaultConversationSettings } from './conversation-settings';
import type { ConversationsPort } from './conversations';
import { noConversation, unavailable } from './unavailable';
import { settingsOf } from './voice-choices';

const notAvailable = 'Conversations are not available';

const noUpdate: ConversationUpdate = {
  conversation: null,
  ended: null,
  partials: [],
  enabled: defaultConversationSettings.enabled,
  volume: defaultConversationSettings.options.volume,
  microphoneGain: defaultConversationSettings.options.microphoneGain,
};

const noStatus: ConversationStatus = {
  ...noUpdate,
  availability: { usable: false, reason: notAvailable },
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
    setConversationOptions: refused,
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
  updates: async function* () {
    await Promise.resolve();
    yield noUpdate;
  },
};
