import { describe, expect, it } from 'vitest';
import { FakeConversationConnection } from '../../../../mocks/conversation/fake-conversation-connection';
import { offerTo } from './offer-to';

describe('offering a call to the Server', () => {
  it('sends the offer on', async () => {
    const sent: string[] = [];
    const connection = new FakeConversationConnection(Promise.resolve('v=0 offer'));

    await offerTo(connection, (offer) => void sent.push(offer));

    expect(sent).toEqual(['v=0 offer']);
    expect(connection.closed).toBe(false);
  });

  it('starts no call and lets go of the connection when the microphone is refused', async () => {
    const sent: string[] = [];

    const connection = new FakeConversationConnection(
      Promise.reject(new Error('Microphone access is needed to talk.')),
    );

    await offerTo(connection, (offer) => void sent.push(offer));

    expect(sent).toEqual([]);
    expect(connection.closed).toBe(true);
  });

  it('does nothing where the App carries no audio', async () => {
    const sent: string[] = [];

    await offerTo(null, (offer) => void sent.push(offer));

    expect(sent).toEqual([]);
  });
});
