import { describe, expect, it } from 'vitest';
import { FakeConversationConnection } from '../../../../mocks/conversation/fake-conversation-connection';
import { startConversation } from './start-conversation';

const answered = (): Promise<{ answer: string }> =>
  Promise.resolve({ answer: 'v=0 answer' });

const refused = (): Promise<{ answer: string }> =>
  Promise.reject(new Error('Conversations are off'));

describe('starting a call from a Session page', () => {
  /*
   * A closed Session's Feed sends its rows and closes, and the page keeps no live changes after that. Starting a call
   * opens the Session on the Server, which then starts Turns the page never asked for, so the page resumes its Feed.
   */
  it("resumes the page's Feed once the Server started the call", async () => {
    const connection = new FakeConversationConnection();
    const resumed: string[] = [];

    await startConversation(connection, {
      send: answered,
      resumeFeed: () => resumed.push('feed'),
    });

    expect(connection.accepted).toEqual(['v=0 answer']);
    expect(resumed).toEqual(['feed']);
  });

  it('resumes it after a refused start too, so the Notice saying why arrives', async () => {
    const connection = new FakeConversationConnection();
    const resumed: string[] = [];

    await startConversation(connection, {
      send: refused,
      resumeFeed: () => resumed.push('feed'),
    });

    expect(connection.closed).toBe(true);
    expect(resumed).toEqual(['feed']);
  });

  it('leaves the Feed alone when the microphone was refused and nothing was sent', async () => {
    const connection = new FakeConversationConnection(
      Promise.reject(new Error('Microphone access is needed to talk.')),
    );

    const resumed: string[] = [];

    await startConversation(connection, {
      send: answered,
      resumeFeed: () => resumed.push('feed'),
    });

    expect(connection.closed).toBe(true);
    expect(resumed).toEqual([]);
  });
});
