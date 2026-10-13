import { unsupportedAccountLogin } from './protocol-login.ts';
import {
  scriptedInitialization,
  type ScriptedScenario,
} from './scripted-scenario.ts';

// Answers initialize without the session/close capability Argo requires.
const withoutSessionClose: ScriptedScenario['initialize'] = {
  ...scriptedInitialization,
  agentCapabilities: {
    ...scriptedInitialization.agentCapabilities,
    sessionCapabilities: { resume: {} },
  },
};
// Fails ACP initialize; the error carries a credential that must never reach the App.
const leakingFailure =
  'The CLI could not read its config: Authorization: Bearer sk-fixture-secret-0123456789';

// Agents whose readiness check fails in each named way; `base` supplies the shared prompt steps.
export const readinessScenarios = (
  base: ScriptedScenario,
): Record<
  'account-not-supported' | 'not-compatible' | 'cant-start',
  ScriptedScenario
> => ({
  'account-not-supported': { ...base, ...unsupportedAccountLogin },
  'not-compatible': { ...base, initialize: withoutSessionClose },
  'cant-start': {
    ...base,
    responses: { initialize: [{ error: leakingFailure }] },
  },
});
