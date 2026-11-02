import { fileURLToPath } from 'node:url';
import { expect, onTestFinished } from 'vitest';
import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
} from './fixture-services';
import { startPluginTest } from './index';
import type { PluginTest, PluginTestOptions } from './test-types';

export const projects = [
  { id: 'one', name: 'One', originUrl: null },
  { id: 'two', name: 'Two', originUrl: null },
];

export const wait = { timeout: 15_000 };

export const signInLabel = 'Sign in to Service';

export const itemsText = 'the items';

const unauthorized = 401;

export type ServiceFixture = {
  requests: Awaited<ReturnType<typeof fixtureServices>>['requests'];
  // The tokens the service accepts; a test clears one to revoke it.
  accepted: Set<string>;
  // Set to make every token it issues run out, with a refresh token.
  expiresIn: { seconds: number | null };
  // Bodies of the token endpoint's requests.
  tokenBodies: () => URLSearchParams[];
  // The bearer token of the reads that reached `/items`.
  readTokens: () => (string | undefined)[];
};

const tokenOf = (authorization: string | undefined): string | undefined =>
  authorization?.replace(/^Bearer /, '');

const refusal = { status: unauthorized, json: { message: 'Bad token' } };

const expiring = (
  seconds: number | null,
  access: string,
): Record<string, string | number> =>
  seconds === null
    ? {}
    : { expires_in: seconds, refresh_token: `refresh-${access}` };

function tokenReply(
  fixture: Pick<ServiceFixture, 'accepted' | 'expiresIn'>,
  number: number,
): FixtureAnswer {
  const access = `token-${number}`;

  fixture.accepted.add(access);

  return {
    json: {
      access_token: access,
      ...expiring(fixture.expiresIn.seconds, access),
    },
  };
}

const deviceReply: FixtureAnswer = {
  json: {
    device_code: 'device-code',
    user_code: 'WDJB-MJHT',
    verification_uri: 'https://auth.service.example/activate',
    interval: 5,
    expires_in: 900,
  },
};

type Requests = ServiceFixture['requests'];

const reachedPath = (requests: Requests, wanted: string): Requests =>
  requests.filter(({ path }) => path === wanted);

const isAccepted = (
  { accepted }: Pick<ServiceFixture, 'accepted'>,
  token: string | undefined,
): boolean => token !== undefined && accepted.has(token);

// What a read answers: the token's owner on `/me`, and the items anywhere else.
function readReply(
  state: Pick<ServiceFixture, 'accepted'>,
  { path, headers }: Pick<FixtureRequest, 'path' | 'headers'>,
): FixtureAnswer {
  const token = tokenOf(headers.authorization);

  if (!isAccepted(state, token)) return refusal;

  return path === '/me'
    ? { json: { login: `person-${token}` } }
    : { text: itemsText };
}

type ServiceState = Pick<ServiceFixture, 'accepted' | 'expiresIn'>;

function answerer(state: ServiceState): Parameters<typeof fixtureServices>[0] {
  let issued = 0;

  return (request) => {
    if (request.path === '/device') return deviceReply;

    if (request.path !== '/token') return readReply(state, request);

    issued += 1;

    return tokenReply(state, issued);
  };
}

const bodiesOf = (requests: Requests): URLSearchParams[] =>
  reachedPath(requests, '/token').map(({ body }) => new URLSearchParams(body));

const readTokensOf = (requests: Requests): (string | undefined)[] =>
  reachedPath(requests, '/items').map(({ headers }) =>
    tokenOf(headers.authorization),
  );

const emptyState = (): ServiceState => ({
  accepted: new Set(),
  expiresIn: { seconds: null },
});

// One service with every endpoint a sign-in reaches: the Account's reads on its API host, and the OAuth ones.
export async function serviceFixture(): Promise<
  ServiceFixture & Pick<PluginTestOptions, 'network'>
> {
  const state = emptyState();
  const { network, requests } = await fixtureServices(answerer(state));

  return {
    ...state,
    network,
    requests,
    tokenBodies: () => bodiesOf(requests),
    readTokens: () => readTokensOf(requests),
  };
}

const directory = fileURLToPath(
  new URL('../mocks/sign-in-plugins', import.meta.url),
);

export async function start(
  plugin: 'device' | 'redirect',
  options: Pick<PluginTestOptions, 'network' | 'openBrowser'>,
): Promise<PluginTest> {
  const test = await startPluginTest({
    directory,
    pluginId: `sign-in-${plugin}`,
    version: '0.0.0',
    clockStart: 1_000_000,
    projects,
    ...options,
  });

  onTestFinished(() => test.close());

  return test;
}

const clockStep = 5_000;

export type View = Awaited<ReturnType<PluginTest['mount']>>;

export async function clockUntil(
  test: PluginTest,
  view: View,
  text: string,
): Promise<void> {
  await expect
    .poll(async () => {
      await test.clock.advance(clockStep);

      return JSON.stringify(view.trees.at(-1));
    }, wait)
    .toContain(text);
}
