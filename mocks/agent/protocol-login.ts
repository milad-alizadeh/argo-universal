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
        steps: [
          {
            type: 'raw',
            frame: JSON.stringify({
              jsonrpc: '2.0',
              method: '_auth/status_update',
              params: account,
            }),
          },
        ],
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
        steps: [
          {
            type: 'raw',
            frame: JSON.stringify({
              jsonrpc: '2.0',
              method: '_auth/status_update',
              params: signedOut,
            }),
          },
        ],
      },
    ],
  },
} satisfies Pick<ScriptedScenario, 'initialize' | 'responses'>;

export const protocolSessionLogin = (credentials: string): ScriptedScenario =>
  ({
    steps: [],
    authentication: { credentials },
    initialize: {
      ...scriptedInitialization,
      authMethods: [{ id: 'login', name: 'Sign in' }],
    },
  }) satisfies ScriptedScenario;
