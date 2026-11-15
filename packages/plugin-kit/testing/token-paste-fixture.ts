import { fileURLToPath } from 'node:url';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { onTestFinished } from 'vitest';
import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
} from './fixture-services';
import { startPluginTest } from './host';
import type { OpenPage } from './open-page';
import type { PluginTest, PluginTestOptions } from './test-types';

export const itemsText = 'the items';

const unauthorized = 401;

// A fixture service whose tokens are API tokens a person pastes: each one it accepts, and whose it is.
export type TokenService = Pick<PluginTestOptions, 'network'> & {
  // Takes a token back, as revoking it in the service does.
  revoke: (token: string) => void;
  // The bearer tokens of the reads that reached `/items`.
  readTokens: () => string[];
};

const bearerOf = ({ headers }: Pick<FixtureRequest, 'headers'>): string =>
  String(headers.authorization).replace('Bearer ', '');

// The service's answer: `/me` names whose token it is, as text, `/items` reads; a token it does not accept is refused.
const answerWith =
  (accepted: Map<string, string>) =>
  (request: FixtureRequest): FixtureAnswer => {
    const login = accepted.get(bearerOf(request));

    if (login === undefined)
      return { status: unauthorized, json: { message: 'Bad token' } };

    return request.path === '/me' ? { text: login } : { text: itemsText };
  };

export async function tokenService(
  tokens: Record<string, string>,
): Promise<TokenService> {
  const accepted = new Map(Object.entries(tokens));
  const { network, requests } = await fixtureServices(answerWith(accepted));

  return {
    network,
    revoke: (token) => accepted.delete(token),
    readTokens: () =>
      requests.filter(({ path }) => path === '/items').map(bearerOf),
  };
}

const directory = fileURLToPath(
  new URL('../mocks/token-paste-plugins', import.meta.url),
);

export const borrowerId = 'token-paste-borrower';

export async function start(service: TokenService): Promise<PluginTest> {
  const test = await startPluginTest({
    directory,
    pluginId: 'token-paste',
    version: '0.0.0',
    clockStart: 0,
    projects: [{ id: 'one', name: 'One', originUrl: null }],
    network: service.network,
  });

  onTestFinished(() => test.close());

  return test;
}

const isSecretField = (node: { type: string }): boolean =>
  node.type === 'FieldGroup.SecretField';

// How long typed text waits before it is sent, as the App coalesces it.
const typingPauseMs = 300;

// Pastes a token into the page's SecretField, as a person does, and waits for the run it sends.
export async function paste(
  test: PluginTest,
  page: OpenPage,
  token: string,
): Promise<void> {
  await page.act(isSecretField, 'onChangeText', token);
  await test.clock.advance(typingPauseMs);
}

export const secretFieldOf = (page: OpenPage): WireNode =>
  page.find(isSecretField);
