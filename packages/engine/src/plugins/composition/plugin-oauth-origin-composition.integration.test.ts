import { expect, it } from 'vitest';
import {
  originJourney,
  overlappingOAuth,
  viewlessOAuth,
} from '#mocks/oauth-origin';
import { serialiseOnOAuthPort } from '#mocks/oauth-port-lock';

// Which run or draw an OAuth call is for decides whether it runs: only the Server Device's, or an exchange it started.

const journeyMs = 30_000;

serialiseOnOAuthPort();

const networkFailure = 'fetch failed';

const redirectUri = 'http://127.0.0.1:51789/callback';

const refusal = 'Refused: OAuth must run on the Server Device';

it(
  'refuses OAuth outside any run or draw before opening a browser or listener',
  async () => {
    const host = await viewlessOAuth();
    expect(host.result).toEqual({
      start: { error: refusal },
      wait: { error: refusal },
    });
    expect(host.opened).toEqual([]);
    await expect(fetch(redirectUri)).rejects.toThrow(networkFailure);
  },
  journeyMs,
);

it(
  'keeps overlapping Server and Paired Device run origins across awaits',
  async () => {
    const host = await overlappingOAuth();
    await expect
      .poll(() => host.result(false), { timeout: 10_000 })
      .toEqual({ start: { error: refusal }, wait: { error: refusal } });
    await expect
      .poll(() => host.result(true), { timeout: 10_000 })
      .toEqual({ start: { value: true }, wait: { value: null } });
    expect(host.opened).toEqual([]);
  },
  journeyMs,
);

it(
  'lets a later run await an exchange its Plugin started on the Server Device',
  async () => {
    const host = await originJourney();
    const state = await host.run('begin', {}, true);

    if (typeof state !== 'string') throw new Error('No exchange started');
    const finished = host.run('finish', { state }, false);

    await expect.poll(() => host.opened.length, { timeout: 10_000 }).toBe(1);
    await fetch(`${redirectUri}?state=${state}&code=code-later`);

    expect(await finished).toEqual({
      code: 'code-later',
      verifier: expect.any(String),
    });
    // A paired device still cannot await a state its Plugin never started.
    expect(await host.run('finish', { state: 'unissued' }, false)).toBe(
      refusal,
    );
  },
  journeyMs,
);
