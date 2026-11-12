import { fileURLToPath } from 'node:url';
import { expect, onTestFinished } from 'vitest';
import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from './fixture-services';
import { startPluginTest } from './host';
import type { OpenPage } from './open-page';
import type { PluginTest, PluginTestOptions } from './test-types';

const projects = [{ id: 'one', name: 'One', originUrl: null }];

export const signInLabel = 'Sign in to Service';

export const itemsText = 'the items';

const unauthorized = 401;

const accepted = 'token-1';

export type ServiceFixture = Pick<FixtureServices, 'network' | 'requests'> & {
  // The bodies of the token endpoint's requests, and the bearer tokens of the reads that reached `/items`.
  tokenBodies: () => URLSearchParams[];
  readTokens: () => string[];
};

const deviceReply: FixtureAnswer = {
  json: {
    device_code: 'device-code',
    user_code: 'WDJB-MJHT',
    verification_uri: 'https://auth.service.example/activate',
    interval: 5,
    expires_in: 900,
  },
};

const bearerOf = ({ headers }: Pick<FixtureRequest, 'headers'>): string =>
  String(headers.authorization).replace('Bearer ', '');

function readReply(request: FixtureRequest): FixtureAnswer {
  if (bearerOf(request) !== accepted)
    return { status: unauthorized, json: { message: 'Bad token' } };

  return request.path === '/me'
    ? { json: { login: 'person' } }
    : { text: itemsText };
}

const answer = (request: FixtureRequest): FixtureAnswer => {
  if (request.path === '/device') return deviceReply;

  return request.path === '/token'
    ? { json: { access_token: accepted } }
    : readReply(request);
};

const pathsOf = (requests: FixtureRequest[], path: string): FixtureRequest[] =>
  requests.filter((request) => request.path === path);

// One fixture service with every endpoint a sign-in reaches: the OAuth ones, and the Account's reads on its API host.
export async function serviceFixture(): Promise<ServiceFixture> {
  const { network, requests } = await fixtureServices(answer);

  return {
    network,
    requests,
    tokenBodies: () =>
      pathsOf(requests, '/token').map(({ body }) => new URLSearchParams(body)),
    readTokens: () => pathsOf(requests, '/items').map(bearerOf),
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
    clockStart: 0,
    projects,
    ...options,
  });

  onTestFinished(() => test.close());

  return test;
}

const clockStep = 5000;

const stepLimit = 6;

// Moves the Plugin's clock until the page shows the text, as a poll that comes due does.
export async function clockUntil(
  test: PluginTest,
  page: OpenPage,
  text: string,
): Promise<void> {
  for (let step = 0; step < stepLimit && !page.findText(text); step += 1) {
    await test.clock.advance(clockStep);
    await page.draw();
  }

  expect(page.findText(text)).toBeDefined();
}
