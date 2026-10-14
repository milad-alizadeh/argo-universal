import type { AuthStatus, AuthStatusUpdateNotification } from '@repo/contracts';
import type {
  ScriptedScenario,
  ScriptedStep,
} from '@repo/mocks/agent/scripted-scenario';
import { resourceInitialization } from './acp-resource';

export const loginOwner = 'da44be12-d5f4-4b4e-b5a8-602fd61f4c89';

export const otherLoginOwner = '4460db08-9346-46c2-abfe-d57b65885a11';

export const loginAgentId = 'mock';

export const loginMethodId = 'opaque-subscription';

export const loginRequestId = 'exact-device-request';

export const accountStatus: AuthStatus = {
  kind: 'account',
  label: 'ChatGPT',
  account: { plan: 'plus' },
};

export const signedOutStatus: AuthStatus = {
  kind: 'none',
  label: 'Signed out',
};

export const loginStatusStep = (authStatus: AuthStatus): ScriptedStep => {
  const params: AuthStatusUpdateNotification = { authStatus };

  return {
    type: 'raw',
    frame: JSON.stringify({
      jsonrpc: '2.0',
      method: '_auth/status_update',
      params,
    }),
  };
};

export const loginScenario = (
  steps: readonly ScriptedStep[] = [],
): ScriptedScenario => ({
  steps: [],
  initialize: {
    ...resourceInitialization,
    agentCapabilities: {
      ...resourceInitialization.agentCapabilities,
      _meta: { authStatus: {} },
    },
    authMethods: [{ id: loginMethodId, name: 'Subscription sign-in' }],
  },
  responses: {
    // Server start's Readiness check, then the sign-in, then every later check.
    initialize: [
      { steps: [loginStatusStep(signedOutStatus)] },
      { steps: [loginStatusStep(signedOutStatus)] },
      { steps: [loginStatusStep(accountStatus)] },
    ],
    authenticate: [{ steps: [...steps, loginStatusStep(accountStatus)] }],
  },
});

export const loginBrowserStep: ScriptedStep = {
  type: 'request-elicitation',
  request: {
    mode: 'url',
    url: 'https://login.example/device',
    elicitationId: loginRequestId,
    message: 'Enter code ABCD-EFGH',
  },
};
