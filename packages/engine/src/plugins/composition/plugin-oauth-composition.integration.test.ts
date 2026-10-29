import { request } from 'node:http';
import { createServer } from 'node:http';
import { expect, it } from 'vitest';
import { overlappingOAuth, viewlessOAuth } from '#mocks/oauth-origin';
import { oauthPlugins, challenge } from '#mocks/oauth-plugins';
import { serialiseOnOAuthPort } from '#mocks/oauth-port-lock';

const journeyMs = 30_000;

serialiseOnOAuthPort();

const networkFailure = 'fetch failed';

const callbackHost = '127.0.0.1:51789';

const redirectUri = 'http://127.0.0.1:51789/callback';

it(
  'routes two concurrent waiters by issued state and returns the matching PKCE verifier',
  async () => {
    const host = await oauthPlugins(['alice', 'bob']);
    const alice = await host.started('alice');
    const bob = await host.started('bob');
    expect(alice.redirectUri).toBe(redirectUri);
    expect(alice.codeChallengeMethod).toBe('S256');
    expect(
      (await fetch(`${alice.redirectUri}?state=unissued&code=wrong`)).status,
    ).toBe(400);

    const page = await fetch(
      `${bob.redirectUri}?state=${bob.state}&code=code-bob`,
    );

    const body = await page.text();
    expect(page.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(page.headers.get('x-content-type-options')).toBe('nosniff');
    expect(body).toContain('You can close this tab and return to Argo.');
    expect(body).not.toContain('code-bob');
    const bobResult = await host.result('bob');

    if (!bobResult) throw new Error('Missing Bob OAuth result');
    expect(bobResult.code).toBe('code-bob');
    expect(challenge(bobResult.verifier)).toBe(bob.codeChallenge);
    await fetch(`${alice.redirectUri}?state=${alice.state}&code=code-alice`);
    const aliceResult = await host.result('alice');

    if (!aliceResult) throw new Error('Missing Alice OAuth result');
    expect(aliceResult.code).toBe('code-alice');
    expect(challenge(aliceResult.verifier)).toBe(alice.codeChallenge);
    expect(host.opened).toHaveLength(2);
  },
  journeyMs,
);

it(
  'times out after five minutes on the shared Plugin clock and closes the listener',
  async () => {
    const host = await oauthPlugins();
    await host.started();
    await host.clock.advance(5 * 60 * 1000);
    expect(await host.result()).toBeNull();
    await expect(fetch(redirectUri)).rejects.toThrow(networkFailure);
  },
  journeyMs,
);

it.each([
  { path: '/callback', host: 'evil.example:51789', status: 403 },
  { path: '/elsewhere', host: callbackHost, status: 404 },
  { path: '//[', host: callbackHost, status: 404 },
])(
  'refuses callback $path with Host $host',
  async ({ path, host: header, status }) => {
    const host = await oauthPlugins();
    await host.started();

    const received = await new Promise<number | undefined>(
      (resolve, reject) => {
        const req = request(
          `http://127.0.0.1:51789${path}`,
          { headers: { host: header } },
          (response) => {
            response.resume();
            resolve(response.statusCode);
          },
        );

        req.once('error', reject);
        req.end();
      },
    );

    expect(received).toBe(status);
  },
  journeyMs,
);

it(
  'resolves an OAuth denial to nothing',
  async () => {
    const host = await oauthPlugins();
    const start = await host.started();
    await fetch(
      `${start.redirectUri}?state=${start.state}&error=access_denied`,
    );
    expect(await host.result()).toBeNull();
  },
  journeyMs,
);

it(
  'ends a pending exchange when the Plugin stops',
  async () => {
    const host = await oauthPlugins();
    await host.started();
    await host.caller.plugin.setEnabled({ pluginId: 'alice', enabled: false });
    await expect(fetch(redirectUri)).rejects.toThrow(networkFailure);
  },
  journeyMs,
);

it(
  'fails the sign-in naming the port when the callback port is already occupied',
  async () => {
    const occupied = createServer();
    await new Promise<void>((resolve, reject) => {
      occupied.once('error', reject);
      occupied.listen(51789, '127.0.0.1', resolve);
    });

    try {
      const host = await oauthPlugins();
      expect(await host.failure()).toContain('51789');
      expect(await host.result()).toBeNull();
      expect(host.opened).toEqual([]);
    } finally {
      await new Promise<void>((resolve) => occupied.close(() => resolve()));
    }
  },
  journeyMs,
);

const refusal = 'Refused: OAuth must run on the Server Device';

it(
  'refuses OAuth without an App view before opening a browser or listener',
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
  'keeps overlapping Server and Paired Device view origins across awaits',
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
