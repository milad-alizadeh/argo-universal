import { describe, expect, it } from 'vitest';
import { ScriptedAuth } from '#mocks/scripted-auth';
import { defaultConversationProvider } from './engine-input';
import { FakeConversationProvider } from './fake-provider';
import { GptLiveProvider } from './gpt-live/gpt-live-provider';

describe('the Conversation provider a Server uses by default', () => {
  it('is the fake when ARGO_CONVERSATION_PROVIDER asks for it', () => {
    const provider = defaultConversationProvider({
      ARGO_CONVERSATION_PROVIDER: 'fake',
    });

    expect(provider).toBeInstanceOf(FakeConversationProvider);
  });

  it('is GPT-Live otherwise, and building it asks Codex for nothing', () => {
    const auth = new ScriptedAuth([]);

    const provider = defaultConversationProvider({}, auth);

    expect(provider).toBeInstanceOf(GptLiveProvider);
    expect(auth.asked).toBe(0);
  });
});
