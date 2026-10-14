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

// Answers initialize without reporting its account, as OpenCode and Gemini CLI do.
const withoutAccountReport: ScriptedScenario['initialize'] = {
  ...scriptedInitialization,
  agentCapabilities: {
    ...scriptedInitialization.agentCapabilities,
    _meta: {},
  },
};

// The version the `agent-info` scenario reports in ACP agentInfo, unlike any fixture package release.
export const reportedAgentVersion = '0.47.0';

// Reports its name and version in ACP agentInfo, as an Agent behind an adapter may.
const withAgentInfo: ScriptedScenario['initialize'] = {
  ...scriptedInitialization,
  agentInfo: { name: 'fixture-agent', version: reportedAgentVersion },
};

// ACP's auth_required error, which an Agent returns for a request that needs sign-in.
const authRequired = { code: -32000, message: 'Authentication required' };

// Fails ACP initialize; the error carries a credential that must never reach the App.
const leakingFailure =
  'The CLI could not read its config: Authorization: Bearer sk-fixture-secret-0123456789';

type SignInName =
  | 'unreported-account'
  | 'sign-in-on-session'
  | 'sign-in-on-prompt';

type ReadinessName =
  | SignInName
  | 'agent-info'
  | 'account-not-supported'
  | 'not-compatible'
  | 'cant-start';

const signInOn = (
  method: 'session/new' | 'session/prompt',
  unreported: ScriptedScenario,
): ScriptedScenario => ({
  ...unreported,
  responses: { [method]: [{ error: authRequired }] },
});

// Agents that do not report their account, and answer a later request with auth_required.
const signInScenarios = (
  base: ScriptedScenario,
): Record<SignInName, ScriptedScenario> => {
  const unreported = { ...base, initialize: withoutAccountReport };

  return {
    'unreported-account': unreported,
    'sign-in-on-session': signInOn('session/new', unreported),
    'sign-in-on-prompt': signInOn('session/prompt', unreported),
  };
};

// Agents whose readiness check answers in each named way; `base` supplies the shared prompt steps.
export const readinessScenarios = (
  base: ScriptedScenario,
): Record<ReadinessName, ScriptedScenario> => ({
  ...signInScenarios(base),
  'agent-info': { ...base, initialize: withAgentInfo },
  'account-not-supported': { ...base, ...unsupportedAccountLogin },
  'not-compatible': { ...base, initialize: withoutSessionClose },
  'cant-start': {
    ...base,
    responses: { initialize: [{ error: leakingFailure }] },
  },
});
