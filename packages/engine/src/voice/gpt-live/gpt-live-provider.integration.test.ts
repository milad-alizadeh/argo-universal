import { afterEach, describe, expect, it } from 'vitest';
import {
  fixtureOf,
  request,
  signedIn,
  type GptLiveFixture,
} from '#mocks/gpt-live-setup';
import { codexAppServerAuth } from './codex-auth';
import { createGptLiveProvider } from './gpt-live-provider';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

async function setup(
  ...input: Parameters<typeof fixtureOf>
): Promise<GptLiveFixture> {
  fixture = await fixtureOf(...input);

  return fixture;
}

describe('GPT-Live provider starting a call', () => {
  it('creates a call with the token, the offer and the session, then joins the control link', async () => {
    const { endpoint, start } = await setup([signedIn('t1')], ['t1']);

    const call = await start(request);

    expect(call.answer).toBe('v=0 answer');
    expect(endpoint.created).toHaveLength(1);
    expect(endpoint.created.at(0)).toMatchObject({
      authorization: 'Bearer t1',
      alpha: 'quicksilver=v2',
      url: expect.stringContaining('intent=quicksilver&architecture=avas'),
      sdp: 'v=0 offer',
      session: {
        model: 'gpt-live-1.1-codex',
        instructions: expect.stringContaining('Session: Fix the build'),
        audio: { output: { voice: 'cove' } },
        delegation: { type: 'client' },
      },
    });
    expect(endpoint.linkTokens).toEqual(['t1']);
    expect(endpoint.links).toHaveLength(1);
  });

  it('asks Codex for a new token once when the first is rejected', async () => {
    const { endpoint, auth, start } = await setup(
      [signedIn('stale'), signedIn('fresh')],
      ['fresh'],
    );

    const call = await start(request);

    expect(call.answer).toBe('v=0 answer');
    expect(auth.asked).toBe(2);
    expect(endpoint.created).toHaveLength(1);
    expect(endpoint.created.at(0)?.authorization).toBe('Bearer fresh');
  });

  it('fails the start when the second token is rejected too, asking no third time', async () => {
    const { auth, provider } = await setup(
      [signedIn('bad1'), signedIn('bad2')],
      ['good'],
    );

    await expect(provider.start(request)).rejects.toThrow(/rejected/i);
    expect(auth.asked).toBe(2);
  });

  it('joins the same call again with a new token when the control link rejects the first, creating no second call', async () => {
    const { endpoint, auth, start } = await setup(
      [signedIn('stale'), signedIn('fresh')],
      ['stale', 'fresh'],
      { linkAccepts: ['fresh'] },
    );

    await start(request);

    expect(endpoint.created).toHaveLength(1);
    expect(endpoint.linkTokens).toEqual(['stale', 'fresh']);
    expect(auth.asked).toBe(2);
  });
});

describe('GPT-Live provider voices', () => {
  it('offers the service’s voices, Cove first as the default', async () => {
    const { provider } = await setup([signedIn('t1')], ['t1']);

    const voices = await provider.voices();

    expect(voices.map(({ id }) => id)).toEqual([
      'cove',
      'juniper',
      'maple',
      'spruce',
      'ember',
      'vale',
      'breeze',
      'arbor',
      'sol',
      'marin',
      'aube',
      'bubbie',
      'haetsal',
      'hanul',
      'himari',
      'leher',
      'miko',
      'neer',
      'porto',
      'rindo',
      'rio',
      'rivage',
      'selva',
      'sonna',
      'tinta',
      'viola',
    ]);
    expect(voices.find(({ id }) => id === 'haetsal')?.label).toBe('Haetsal');
  });

  it('creates the call with the chosen voice', async () => {
    const { endpoint, start } = await setup([signedIn('t1')], ['t1']);

    await start({ ...request, voice: 'marin' });

    expect(endpoint.created.at(0)?.session.audio.output.voice).toBe('marin');
  });
});

describe('GPT-Live provider availability', () => {
  it('is unusable, with the reason, when Codex is not signed in with ChatGPT', async () => {
    const reason = 'Sign in to Codex with ChatGPT';
    const { provider } = await setup([{ signedIn: false, reason }], []);

    expect(await provider.availability()).toEqual({ usable: false, reason });
    await expect(provider.start(request)).rejects.toThrow(reason);
  });

  it('is usable when Codex holds a ChatGPT token', async () => {
    const { provider } = await setup([signedIn('t1')], ['t1']);

    expect(await provider.availability()).toEqual({ usable: true });
  });

  it('is unusable, naming Codex, when Codex is not installed, and a start fails the same way', async () => {
    const provider = createGptLiveProvider({
      auth: codexAppServerAuth({
        program: () => {
          throw new Error('not found');
        },
      }),
    });

    expect(await provider.availability()).toEqual({
      usable: false,
      reason: expect.stringContaining('Install Codex'),
    });
    await expect(provider.start(request)).rejects.toThrow('Install Codex');
  });
});
