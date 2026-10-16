import type {
  AuthenticateRequest,
  InitializeRequest,
} from '@agentclientprotocol/sdk';
import { protocolSessionLogin } from '@repo/mocks/agent/protocol-login';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it('authenticates on the rejected open connection and joins a pending attempt', async () => {
  const entered = Promise.withResolvers<AuthenticateRequest>();
  const finish = Promise.withResolvers<void>();
  const initialization: InitializeRequest[] = [];

  const host = await startAcpEngine({
    ...protocolSessionLogin(),
    responses: {
      initialize: [{ requests: initialization }],
      authenticate: [
        { received: entered, waitFor: finish.promise, result: {} },
      ],
    },
  });

  await expect(
    host.caller.session.new(emptySessionInput),
  ).rejects.toMatchObject({
    cause: { openError: { type: 'auth-required' } },
  });
  const subject = { agent: 'mock', projectId: 'project-1' };
  expect(await host.caller.agents.authState(subject)).toEqual({
    methods: [{ type: 'agent', id: 'login', name: 'Sign in' }],
    pending: null,
  });

  const first = host.caller.agents.authenticate({
    ...subject,
    methodId: 'login',
  });

  await entered.promise;

  const second = host.caller.agents.authenticate({
    ...subject,
    methodId: 'login',
  });

  expect((await host.caller.agents.authState(subject)).pending).toEqual({
    methodId: 'login',
  });
  finish.resolve();
  expect(await Promise.all([first, second])).toEqual([
    { status: 'ok' },
    { status: 'ok' },
  ]);
  expect((await host.caller.agents.authState(subject)).pending).toBeNull();
  await host.caller.session.new(emptySessionInput);
  expect(host.agent.processes).toHaveLength(1);
  const [initialize] = initialization;

  if (!initialize) throw new Error('Initialize was not received');
  expect(initialize.clientCapabilities).toMatchObject({
    auth: { terminal: true },
    elicitation: { form: {} },
    session: { configOptions: { boolean: {} }, notices: {}, compaction: {} },
  });
  expect(initialize.clientCapabilities?.elicitation).toEqual({ form: {} });
  expect(initialize.clientCapabilities).not.toHaveProperty(
    '_meta.terminal-auth',
  );
});

it('a failed protocol method clears pending and can be retried on the same process', async () => {
  const scenario = protocolSessionLogin();

  const host = await startAcpEngine({
    ...scenario,
    responses: { authenticate: [{ error: 'Sign-in failed' }, {}] },
  });

  const subject = { agent: 'mock', projectId: 'project-1' };
  await expect(host.caller.session.new(emptySessionInput)).rejects.toThrow(
    'Authentication required',
  );
  expect(
    await host.caller.agents.authenticate({ ...subject, methodId: 'login' }),
  ).toMatchObject({
    status: 'failed',
    message: expect.stringContaining('Sign-in failed'),
  });
  expect((await host.caller.agents.authState(subject)).pending).toBeNull();
  expect(
    await host.caller.agents.authenticate({ ...subject, methodId: 'login' }),
  ).toEqual({ status: 'ok' });
  await host.caller.session.new(emptySessionInput);
  expect(host.agent.processes).toHaveLength(1);
});

it('preserves supported methods in Agent order and the authentication error description', async () => {
  const description = 'Sign in to your account';
  const ignored = { type: 'env_var', id: 'api', name: 'API key' };

  const protocol = {
    type: 'agent',
    id: 'login',
    name: 'Subscription',
    description: 'Browser sign-in',
  };

  const host = await startAcpEngine({
    steps: [],
    initialize: {
      protocolVersion: 1,
      authMethods: [
        ignored,
        { type: 'terminal', id: 'terminal', name: 'Terminal' },
        protocol,
      ],
    },
    responses: {
      'session/new': [{ error: { code: -32000, message: description } }],
    },
  });

  await expect(host.caller.session.new(emptySessionInput)).rejects.toThrow(
    'Sign in to your account',
  );
  expect(
    await host.caller.agents.authState({
      agent: 'mock',
      projectId: 'project-1',
    }),
  ).toEqual({
    methods: [{ type: 'terminal', id: 'terminal', name: 'Terminal' }, protocol],
    description,
    pending: null,
  });
});

it('cancelling an agent method drops its connection and fails the waiting attempt', async () => {
  const entered = Promise.withResolvers<AuthenticateRequest>();
  const finish = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    ...protocolSessionLogin(),
    responses: {
      authenticate: [{ received: entered, waitFor: finish.promise }],
    },
  });

  await expect(host.caller.session.new(emptySessionInput)).rejects.toThrow(
    'Authentication required',
  );
  const subject = { agent: 'mock', projectId: 'project-1' };

  const result = host.caller.agents.authenticate({
    ...subject,
    methodId: 'login',
  });

  await entered.promise;
  await host.caller.agents.cancelAuthenticate(subject);
  expect(await result).toMatchObject({ status: 'failed' });
  finish.resolve();
  expect((await host.caller.agents.authState(subject)).pending).toBeNull();
  expect(host.agent.processes).toHaveLength(2);
});
