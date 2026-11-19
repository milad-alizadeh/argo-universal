import { afterEach, describe, expect, it } from 'vitest';
import { voiceTurnDone } from '#mocks/gpt-live-frames';
import {
  fixtureOf,
  heard,
  signedIn,
  type GptLiveFixture,
} from '#mocks/gpt-live-setup';
import type { VoiceProviderCall } from '../provider';

let fixture: GptLiveFixture | undefined;

let preview: VoiceProviderCall | undefined;

afterEach(async () => {
  preview?.end();
  await fixture?.close();
  fixture = undefined;
  preview = undefined;
});

const words = "Hi, I'm Sol. This is how I'll sound on your calls.";

// A preview of Sol from a listening-only offer, on a fake service that accepts the token Codex gives.
async function previewed(): Promise<{
  fixture: GptLiveFixture;
  preview: VoiceProviderCall;
}> {
  fixture = await fixtureOf([signedIn('t1')], ['t1']);
  preview = await fixture.provider.preview({
    offer: 'v=0 listening offer',
    voice: 'sol',
    words,
  });

  return { fixture, preview };
}

describe('GPT-Live provider previewing a voice', () => {
  it('creates a call in the voice from the offer, with no coding Agent persona', async () => {
    const { fixture: started, preview: call } = await previewed();

    expect(call.answer).toBe('v=0 answer');
    expect(started.endpoint.created.at(0)).toMatchObject({
      sdp: 'v=0 listening offer',
      session: {
        audio: { output: { voice: 'sol' } },
        instructions: expect.not.stringContaining('coding Agent'),
      },
    });
  });

  // The service speaks first only when asked on the control link; instructions alone leave it silent (live probe, 2026-11-19).
  it('asks the voice, on the control link, to say the words', async () => {
    const { fixture: started } = await previewed();

    await expect
      .poll(() => started.endpoint.received)
      .toEqual([
        {
          type: 'session.context.append',
          channel: 'speakable',
          content: [{ type: 'input_text', text: `Say exactly: "${words}"` }],
        },
      ]);
  });

  it('reports when the voice has finished speaking', async () => {
    const { fixture: started, preview: call } = await previewed();
    const events = heard(call);

    started.endpoint.send(voiceTurnDone);

    await expect
      .poll(() => events)
      .toContainEqual({ type: 'speaking', speaking: false });
  });
});
