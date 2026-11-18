import { afterEach, describe, expect, it } from 'vitest';
import {
  fixtureOf,
  request,
  signedIn,
  type GptLiveFixture,
} from '#mocks/gpt-live-setup';

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.endpoint.close();
  fixture = undefined;
});

async function setup(
  readings: Parameters<typeof fixtureOf>[0],
  accepts: string[],
): Promise<GptLiveFixture> {
  fixture = await fixtureOf(readings, accepts);

  return fixture;
}

describe('GPT-Live provider starting a call', () => {
  it('creates a call with the token, the offer and the alpha header, then joins the control link', async () => {
    const { endpoint, provider } = await setup([signedIn('t1')], ['t1']);

    const call = await provider.start(request);

    expect(call.answer).toBe('v=0 answer');
    expect(endpoint.created).toHaveLength(1);
    expect(endpoint.created.at(0)).toMatchObject({
      authorization: 'Bearer t1',
      alpha: 'quicksilver=v2',
      url: expect.stringContaining('intent=quicksilver&architecture=avas'),
      body: expect.stringContaining('gpt-live-1.1-codex'),
    });
    expect(endpoint.created.at(0)?.body).toContain('v=0 offer');
    expect(endpoint.created.at(0)?.body).toContain('Session: Fix the build');
    expect(endpoint.linkTokens).toEqual(['t1']);
    expect(endpoint.links).toHaveLength(1);
  });

  it('asks Codex for a new token once when the first is rejected', async () => {
    const { endpoint, auth, provider } = await setup(
      [signedIn('stale'), signedIn('fresh')],
      ['fresh'],
    );

    const call = await provider.start(request);

    expect(call.answer).toBe('v=0 answer');
    expect(auth.asked).toBe(2);
    expect(endpoint.created.map(({ authorization }) => authorization)).toEqual([
      'Bearer stale',
      'Bearer fresh',
    ]);
  });

  it('fails the start when the second token is rejected too, asking no third time', async () => {
    const { auth, provider } = await setup(
      [signedIn('bad1'), signedIn('bad2')],
      ['good'],
    );

    await expect(provider.start(request)).rejects.toThrow(/rejected/i);
    expect(auth.asked).toBe(2);
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
});
