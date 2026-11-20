import {
  defaultConversationOptions,
  type ConversationSettings,
} from '@repo/contracts';
import type { DeviceMetersState } from '#features/conversation';
import type { ConversationDevices } from './conversation-devices-section';

// This Device's microphones and speakers, named once the microphone was allowed; the USB microphone is chosen.
export const namedDevices: ConversationDevices = {
  microphones: [
    { id: 'mic-built-in', label: 'MacBook Pro Microphone' },
    { id: 'mic-usb', label: 'USB Microphone' },
  ],
  speakers: [
    { id: 'spk-built-in', label: 'MacBook Pro Speakers' },
    { id: 'spk-headphones', label: 'AirPods Pro' },
  ],
  named: true,
  microphone: 'mic-usb',
  speaker: null,
};

// Before the microphone was allowed once, the browser lists devices without names.
export const unnamedDevices: ConversationDevices = {
  microphones: [
    { id: 'mic-built-in', label: 'Microphone 1' },
    { id: 'mic-usb', label: 'Microphone 2' },
  ],
  speakers: [{ id: 'spk-built-in', label: 'Speaker 1' }],
  named: false,
  microphone: null,
  speaker: null,
};

export const usableVoice: ConversationSettings = {
  enabled: true,
  provider: 'gpt-live',
  voice: 'cove',
  providers: [
    {
      id: 'gpt-live',
      label: 'GPT-Live',
      experimental: true,
      availability: { usable: true },
    },
  ],
  voices: [
    { id: 'cove', label: 'Cove' },
    { id: 'marin', label: 'Marin' },
  ],
  customVoices: [],
  instructions: '',
  options: defaultConversationOptions,
};

export const unusableVoice: ConversationSettings = {
  ...usableVoice,
  providers: [
    {
      id: 'gpt-live',
      label: 'GPT-Live',
      experimental: true,
      availability: {
        usable: false,
        reason: 'Codex needs to be installed and signed in.',
      },
    },
  ],
};

export const stableVoice: ConversationSettings = {
  ...usableVoice,
  providers: usableVoice.providers.map((provider) => ({
    ...provider,
    experimental: false,
  })),
};

// The provider's voices, each described; sample words, not any provider's.
const describedVoices: ConversationSettings['voices'] = [
  { id: 'cove', label: 'Cove', description: 'Calm and even, for long answers' },
  { id: 'juniper', label: 'Juniper', description: 'Bright and quick' },
  { id: 'maple', label: 'Maple', description: 'Warm and low' },
  { id: 'sol', label: 'Sol', description: 'Clear and steady' },
];

const pirate = {
  id: 'pirate',
  label: 'Pirate',
  baseVoice: 'sol',
  description: 'Speaks like a cheerful pirate, slowly.',
};

// The person's own voices, one of them chosen, and instructions for every call.
export const customVoices: ConversationSettings = {
  ...usableVoice,
  voice: 'pirate',
  voices: describedVoices,
  customVoices: [
    pirate,
    {
      id: 'narrator',
      label: 'Narrator',
      baseVoice: 'cove',
      description: 'A calm documentary narrator, unhurried and warm.',
    },
  ],
  instructions: 'Call me Sam. Keep answers under two sentences.',
};

// The form open on a custom voice to edit it.
export const editing = { voice: pirate };

// The form open empty to add a custom voice.
export const adding = {};

// A level that holds still, so a story draws the same glyph every time.
const heldAt = (level: number): DeviceMetersState['microphone'] => ({
  level: () => level,
  subscribe: () => () => {},
});

const metersOf = (
  microphone: number,
  speaker: number,
  testing: boolean,
): DeviceMetersState => ({
  microphone: heldAt(microphone),
  speaker: heldAt(speaker),
  testing,
  onTest: () => {},
});

// Paper "Option D": nothing said and no test sound, the person mid-speech, and the test sound playing.
export const idleMeters = metersOf(0.1, 0, false);

export const speakingMeters = metersOf(0.65, 0, false);

export const testingMeters = metersOf(0.1, 0.6, true);
