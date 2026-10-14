import type { AuthStatusUpdateNotification } from '@repo/contracts';
import {
  scriptedInitialization,
  type ScriptedScenario,
} from './scripted-scenario.ts';

const account: AuthStatusUpdateNotification = {
  authStatus: {
    kind: 'account',
    label: 'Subscription',
    account: { plan: 'plus' },
  },
};

const signedOut: AuthStatusUpdateNotification = {
  authStatus: { kind: 'none', label: 'Signed out' },
};

type RawStep = { type: 'raw'; frame: string };

const authStatusStep = (params: AuthStatusUpdateNotification): RawStep => ({
  type: 'raw',
  frame: JSON.stringify({
    jsonrpc: '2.0',
    method: '_auth/status_update',
    params,
  }),
});

export const protocolLogin = {
  initialize: {
    ...scriptedInitialization,
    agentCapabilities: {
      ...scriptedInitialization.agentCapabilities,
      _meta: { authStatus: {} },
    },
    authMethods: [{ id: 'subscription-method', name: 'Subscription sign-in' }],
  },
  responses: {
    initialize: [
      {
        steps: [authStatusStep(account)],
      },
    ],
    authenticate: [
      {
        steps: [
          {
            type: 'request-elicitation',
            request: {
              mode: 'url',
              url: 'https://login.example/device',
              elicitationId: 'device-login-request',
              message: 'Enter code ABCD-EFGH',
            },
          },
        ],
      },
    ],
  },
} satisfies Pick<ScriptedScenario, 'initialize' | 'responses'>;

export const signedOutProtocolLogin = {
  ...protocolLogin,
  responses: {
    ...protocolLogin.responses,
    initialize: [
      {
        steps: [authStatusStep(signedOut)],
      },
    ],
  },
} satisfies Pick<ScriptedScenario, 'initialize' | 'responses'>;

// Signed in, but with an account that is not a subscription Argo accepts.
export const unsupportedAccountLogin = {
  ...protocolLogin,
  responses: {
    ...protocolLogin.responses,
    initialize: [
      {
        steps: [
          authStatusStep({
            authStatus: {
              kind: 'account',
              label: 'API key',
              account: { plan: 'api' },
            },
          }),
        ],
      },
    ],
  },
} satisfies Pick<ScriptedScenario, 'initialize' | 'responses'>;
