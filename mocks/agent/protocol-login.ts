import {
  scriptedInitialization,
  type ScriptedCredentials,
  type ScriptedScenario,
} from './scripted-scenario.ts';

export const protocolSessionLogin = (
  credentials: ScriptedCredentials,
): ScriptedScenario =>
  ({
    steps: [],
    authentication: { credentials },
    initialize: {
      ...scriptedInitialization,
      authMethods: [{ id: 'login', name: 'Sign in' }],
    },
  }) satisfies ScriptedScenario;
