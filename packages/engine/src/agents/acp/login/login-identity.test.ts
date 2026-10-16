import type { CreateElicitationResponse } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { resourceLaunch } from '#mocks/acp-resource';
import {
  loginScenario,
  loginStatusStep,
  accountStatus as reportedSubscription,
} from '#mocks/agent-login';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';
import type { LoginAgentRequest } from '../..';
import { createLoginAgentOpener } from '../index';

const loginInitialization = loginScenario().initialize;

const methodId = 'opaque-subscription';

const verificationUrl = 'https://example.test/verify';

it('carries a URL Elicitation from the exact authenticate request and returns the same App answer', async () => {
  const requests: LoginAgentRequest[] = [];
  const responses: CreateElicitationResponse[] = [];

  const peer = createScriptedAgentProcess({
    steps: [],
    initialize: loginInitialization,
    responses: {
      authenticate: [
        {
          steps: [
            {
              type: 'request-elicitation',
              request: {
                mode: 'url',
                message: 'Enter ABCD-EFGH',
                elicitationId: 'exact-login-id',
                url: verificationUrl,
              },
              responses,
            },
            loginStatusStep(reportedSubscription),
          ],
        },
      ],
    },
  });

  const login = await createLoginAgentOpener(peer)(
    { name: 'Agent', launch: resourceLaunch },
    {
      signal: new AbortController().signal,
      createElicitation: async (request) => {
        requests.push(request);

        return { action: 'accept' };
      },
    },
  );

  await login.authenticate(methodId);
  expect({ requests, responses, readiness: await login.checkReady() }).toEqual({
    requests: [
      {
        id: 'exact-login-id',
        url: verificationUrl,
        message: 'Enter ABCD-EFGH',
      },
    ],
    responses: [{ action: 'accept' }],
    readiness: { status: 'ready' },
  });
  await login.close();
});

it('does not send another request’s URL Elicitation to the initiating App', async () => {
  const responses: CreateElicitationResponse[] = [];
  const requests: LoginAgentRequest[] = [];

  const peer = createScriptedAgentProcess({
    steps: [],
    initialize: loginInitialization,
  });

  const login = await createLoginAgentOpener(peer)(
    { name: 'Agent', launch: resourceLaunch },
    {
      signal: new AbortController().signal,
      createElicitation: async (request) => {
        requests.push(request);

        return { action: 'accept' };
      },
    },
  );

  const child = peer.processes[0];

  if (!child) throw new Error('Missing mock process');
  await child.connection.client
    .request('elicitation/create', {
      mode: 'url',
      requestId: 'wrong-auth-request',
      elicitationId: 'wrong-id',
      url: verificationUrl,
      message: 'Unowned',
    })
    .then((answer) => responses.push(answer));
  expect({ requests, responses }).toEqual({
    requests: [],
    responses: [{ action: 'cancel' }],
  });
  await login.close();
});

it('settles the exact URL question when the Agent cancels it while the App answer is pending', async () => {
  const cancellation = new AbortController();
  const entered = Promise.withResolvers<AbortSignal>();
  const answers: CreateElicitationResponse[] = [];

  const peer = createScriptedAgentProcess({
    steps: [],
    initialize: loginInitialization,
    responses: {
      authenticate: [
        {
          steps: [
            {
              type: 'request-elicitation',
              request: {
                mode: 'url',
                message: 'Sign in',
                url: verificationUrl,
                elicitationId: 'cancelled-device',
              },
              signal: cancellation.signal,
              responses: answers,
            },
          ],
          error: 'Agent cancelled sign-in',
        },
      ],
    },
  });

  const login = await createLoginAgentOpener(peer)(
    { name: 'Agent', launch: resourceLaunch },
    {
      signal: new AbortController().signal,
      createElicitation: (_, signal) => {
        if (!signal) throw new Error('Missing request lifetime');
        entered.resolve(signal);

        return new Promise(() => {});
      },
    },
  );

  const authenticating = login.authenticate(methodId);
  const observedSignal = await entered.promise;
  cancellation.abort();
  await expect(authenticating).rejects.toThrow('Agent cancelled sign-in');
  expect({ answers, cancelled: observedSignal.aborted }).toEqual({
    answers: [{ action: 'cancel' }],
    cancelled: true,
  });
  await login.close();
});
