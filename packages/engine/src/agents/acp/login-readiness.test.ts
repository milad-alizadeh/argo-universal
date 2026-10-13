import { expect, it } from 'vitest';
import { resourceLaunch } from '#mocks/acp-resource';
import {
  loginScenario,
  loginStatusStep,
  accountStatus as reportedSubscription,
} from '#mocks/agent-login';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import { createLoginAgentOpener } from './index';

const loginInitialization = loginScenario().initialize;

const methodId = 'opaque-subscription';

it('reports the effective subscription after an initially logged-out Agent authenticates', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    initialize: loginInitialization,
    responses: {
      initialize: [
        { steps: [loginStatusStep({ kind: 'none', label: 'Not signed in' })] },
      ],
      authenticate: [{ steps: [loginStatusStep(reportedSubscription)] }],
    },
  });

  const login = await createLoginAgentOpener(peer)(
    { name: 'Agent', launch: resourceLaunch },
    {
      signal: new AbortController().signal,
      createElicitation: async () => ({ action: 'cancel' }),
    },
  );

  await login.authenticate(methodId);
  expect(await login.checkReady()).toEqual({ status: 'ready' });
  await login.close();
});

it.each(['api_key', 'gateway', 'external'] as const)(
  'rejects effective %s billing after a previously compatible account',
  async (kind) => {
    const peer = createScriptedAgentProcess({
      steps: [],
      initialize: loginInitialization,
      responses: {
        initialize: [{ steps: [loginStatusStep(reportedSubscription)] }],
        authenticate: [
          { steps: [loginStatusStep({ kind, label: 'Other billing' })] },
        ],
      },
    });

    const login = await createLoginAgentOpener(peer)(
      { name: 'Agent', launch: resourceLaunch },
      {
        signal: new AbortController().signal,
        createElicitation: async () => ({ action: 'cancel' }),
      },
    );

    await login.authenticate(methodId);
    expect(await login.checkReady()).toMatchObject({
      status: 'account-rejected',
    });
    await login.close();
  },
);

it('does not reuse a prior verified account after rejecting an unknown effective billing report', async () => {
  const peer = createScriptedAgentProcess({
    steps: [],
    initialize: loginInitialization,
    responses: {
      initialize: [{ steps: [loginStatusStep(reportedSubscription)] }],
      authenticate: [
        {
          steps: [
            {
              type: 'raw',
              frame: JSON.stringify({
                jsonrpc: '2.0',
                method: '_auth/status_update',
                params: {
                  authStatus: {
                    kind: 'future-billing',
                    label: 'Unknown billing',
                  },
                },
              }),
            },
          ],
        },
      ],
    },
  });

  const login = await createLoginAgentOpener(peer)(
    { name: 'Agent', launch: resourceLaunch },
    {
      signal: new AbortController().signal,
      createElicitation: async () => ({ action: 'cancel' }),
    },
  );

  await login.authenticate(methodId);
  expect(await login.checkReady()).toMatchObject({
    status: 'account-rejected',
  });
  await login.close();
});
