import { describe, expect, it } from 'vitest';
import { FakeVoiceConnection } from '../../../mocks/voice/fake-voice-connection';
import { offerTo } from './offer-to';

describe('offering a call to the Server', () => {
  it('sends the offer on', async () => {
    const sent: string[] = [];
    const connection = new FakeVoiceConnection(Promise.resolve('v=0 offer'));

    await offerTo(connection, (offer) => sent.push(offer));

    expect(sent).toEqual(['v=0 offer']);
    expect(connection.closed).toBe(false);
  });

  it('starts no call and lets go of the connection when the microphone is refused', async () => {
    const sent: string[] = [];

    const connection = new FakeVoiceConnection(
      Promise.reject(new Error('Microphone access is needed to talk.')),
    );

    await offerTo(connection, (offer) => sent.push(offer));

    expect(sent).toEqual([]);
    expect(connection.closed).toBe(true);
  });

  it('does nothing where the App carries no audio', async () => {
    const sent: string[] = [];

    await offerTo(null, (offer) => sent.push(offer));

    expect(sent).toEqual([]);
  });
});
