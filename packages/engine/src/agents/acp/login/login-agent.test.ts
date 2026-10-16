import type {
  AuthenticateRequest,
  InitializeRequest,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { resourceLaunch, resourceInitialization } from '#mocks/acp-resource';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';
import { createLoginAgentOpener } from '../index';

const methodId = 'opaque-subscription-id';

const subject = { name: 'Generic Agent', launch: resourceLaunch };

const callbacks = {
  signal: new AbortController().signal,
  createElicitation: async (): Promise<{ action: 'cancel' }> => ({
    action: 'cancel',
  }),
};

it('advertises URL Elicitation on the connection that presents login requests', async () => {
  const received = Promise.withResolvers<InitializeRequest>();

  const peer = createScriptedAgentProcess({
    steps: [],
    responses: { initialize: [{ received }] },
  });

  const login = await createLoginAgentOpener(peer)(subject, callbacks);

  try {
    expect((await received.promise).clientCapabilities?.elicitation).toEqual({
      form: {},
      url: {},
    });
  } finally {
    await login.close();
  }
});

it('prefers protocol sign-in when the Agent also offers terminal authentication', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    initialize: {
      ...resourceInitialization,
      authMethods: [
        { id: 'subscription-remote', name: 'Device login' },
        { type: 'terminal', id: 'terminal', name: 'CLI login' },
      ],
    },
  });

  const login = await createLoginAgentOpener(peer)(subject, callbacks);
  expect(login.methods).toEqual([
    { type: 'agent', id: 'subscription-remote', name: 'Device login' },
  ]);
  await login.close();
});

it('authenticates only the exact advertised method identity without opening a Session', async () => {
  const requests: AuthenticateRequest[] = [];
  const openings: object[] = [];

  const peer = createScriptedAgentProcess({
    steps: [],
    initialize: {
      ...resourceInitialization,
      authMethods: [{ id: methodId, name: 'Sign in' }],
    },
    responses: {
      authenticate: [{ requests }],
      'session/new': [{ requests: openings }],
    },
  });

  const login = await createLoginAgentOpener(peer)(subject, callbacks);
  await expect(login.authenticate('invented')).rejects.toThrow('not supported');
  await login.authenticate(methodId);
  expect({ requests, openings }).toEqual({
    requests: [{ methodId: methodId }],
    openings: [],
  });
  await login.close();
});

it('close waits for the observed finite login process exit', async () => {
  const peer = createScriptedAgentProcess({ steps: [], autoExit: false });
  const login = await createLoginAgentOpener(peer)(subject, callbacks);
  const child = requireScriptedProcessAt(peer.processes);
  const closed = login.close();
  let settled = false;
  void closed.then(() => {
    settled = true;
  });
  await Promise.resolve();
  expect(settled).toBe(false);
  child.exited.resolve();
  await closed;
  expect(child.terminations).toBe(1);
});
