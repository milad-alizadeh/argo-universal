import { describe, expect, it } from 'vitest';
import { ScriptedAuth } from '#mocks/gpt-live-setup';
import { defaultVoiceProvider } from './engine-input';
import { FakeVoiceProvider } from './fake-provider';
import { GptLiveProvider } from './gpt-live/gpt-live-provider';

describe('the Voice provider a Server uses by default', () => {
  it('is the fake when ARGO_VOICE_PROVIDER asks for it', () => {
    const provider = defaultVoiceProvider({ ARGO_VOICE_PROVIDER: 'fake' });

    expect(provider).toBeInstanceOf(FakeVoiceProvider);
  });

  it('is GPT-Live otherwise, and building it asks Codex for nothing', () => {
    const auth = new ScriptedAuth([]);

    const provider = defaultVoiceProvider({}, auth);

    expect(provider).toBeInstanceOf(GptLiveProvider);
    expect(auth.asked).toBe(0);
  });
});
