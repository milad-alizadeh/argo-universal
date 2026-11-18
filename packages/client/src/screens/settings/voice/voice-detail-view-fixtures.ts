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
  voices: [{ id: 'cove', label: 'Cove' }],
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
