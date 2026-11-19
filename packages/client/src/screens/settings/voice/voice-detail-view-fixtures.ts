import type { VoiceSettings } from '@repo/contracts';

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
