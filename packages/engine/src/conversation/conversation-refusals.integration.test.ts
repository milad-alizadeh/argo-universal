import { describe, expect, it } from 'vitest';
import {
  callOf,
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';

// Two starts asked at once both pass every check before either reaches the machine; the one that loses is refused as a second call is.
describe('Conversation refusals', () => {
  it('refuses the losing start of two asked at once as a second call', async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const first = await openConversationSession(voice);
    const second = await openConversationSession(voice);

    const starts = await Promise.allSettled([
      host.caller.conversation.start({ sessionId: first.sessionId, offer }),
      host.caller.conversation.start({ sessionId: second.sessionId, offer }),
    ]);

    expect(starts.map(({ status }) => status)).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(starts[1]).toMatchObject({
      reason: {
        code: 'CONFLICT',
        message: 'A Conversation is already running',
      },
    });
    expect(provider.calls).toHaveLength(1);
    expect(await callOf(host)).toMatchObject({ sessionId: first.sessionId });
  });
});
