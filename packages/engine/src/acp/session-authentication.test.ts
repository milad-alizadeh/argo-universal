import type { AuthStatus } from '@repo/contracts';
import { expect, it } from 'vitest';
import { createResourceOpening } from '#mocks/acp-resource';
import {
  loginScenario,
  loginStatusStep,
  accountStatus,
  signedOutStatus,
} from '#mocks/agent-login';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import { createAcpResources } from './index';

const incompatibleAccounts: AuthStatus[] = [
  signedOutStatus,
  { kind: 'api_key', label: 'API key' },
  { kind: 'gateway', label: 'Gateway' },
  { kind: 'account', label: 'Free account', account: { plan: 'free' } },
  { kind: 'account', label: 'Unreported plan' },
];
it.each(incompatibleAccounts)(
  'refuses opening before session/new for effective $label billing',
  async (status) => {
    const requests: object[] = [];
    const scenario = loginScenario();
    const peer = createScriptedAgentProcess({
      ...scenario,
      responses: {
        initialize: [{ steps: [loginStatusStep(status)] }],
        'session/new': [{ requests }],
      },
    });
    const resources = createAcpResources(peer);
    await expect(resources.open(createResourceOpening())).rejects.toThrow(
      /requires sign-in|compatible subscription/,
    );
    expect(requests).toEqual([]);
    await resources.shutdown();
  },
);
it('refuses readiness when session/new changes the effective subscription to API key billing', async () => {
  const requests: object[] = [];
  const peer = createScriptedAgentProcess({
    ...loginScenario(),
    responses: {
      initialize: [{ steps: [loginStatusStep(accountStatus)] }],
      'session/new': [
        {
          requests,
          steps: [loginStatusStep({ kind: 'api_key', label: 'API key' })],
        },
      ],
    },
  });
  const resources = createAcpResources(peer);
  await expect(resources.open(createResourceOpening())).rejects.toThrow(
    'compatible subscription',
  );
  expect({
    opened: requests.length,
    terminations: peer.processes[0]?.terminations,
  }).toEqual({ opened: 1, terminations: 1 });
  await resources.shutdown();
});

it('rejects an advertised generic login method with no supported effective account report before session/new', async () => {
  const requests: object[] = [];
  const peer = createScriptedAgentProcess({
    steps: [],
    initialize: {
      protocolVersion: 1,
      agentCapabilities: { sessionCapabilities: { close: {} } },
      authMethods: [{ id: 'opaque-unknown-billing', name: 'Sign in' }],
    },
    responses: { 'session/new': [{ requests }] },
  });
  const resources = createAcpResources(peer);
  await expect(resources.open(createResourceOpening())).rejects.toThrow(
    'compatible subscription',
  );
  expect(requests).toEqual([]);
  await resources.shutdown();
});
