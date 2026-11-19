import type { VoiceSettings } from '@repo/contracts';
import type { VoiceDevices } from './voice-devices-section';

// This Device's microphones and speakers, named once the microphone was allowed; the USB microphone is chosen.
export const namedDevices: VoiceDevices = {
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
export const unnamedDevices: VoiceDevices = {
  microphones: [
    { id: 'mic-built-in', label: 'Microphone 1' },
    { id: 'mic-usb', label: 'Microphone 2' },
  ],
  speakers: [{ id: 'spk-built-in', label: 'Speaker 1' }],
  named: false,
  microphone: null,
  speaker: null,
};

export const usableVoice: VoiceSettings = {
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
};

export const unusableVoice: VoiceSettings = {
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

export const stableVoice: VoiceSettings = {
  ...usableVoice,
  providers: usableVoice.providers.map((provider) => ({
    ...provider,
    experimental: false,
  })),
};

// The chosen voice has a description its provider publishes; sample words, not any provider's.
export const describedVoice: VoiceSettings = {
  ...usableVoice,
  voices: [
    { id: 'cove', label: 'Cove', description: 'A sample description of Cove' },
    { id: 'marin', label: 'Marin' },
  ],
};
