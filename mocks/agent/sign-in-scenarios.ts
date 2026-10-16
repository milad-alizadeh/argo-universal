import { RequestError, type AuthMethod } from '@agentclientprotocol/sdk';
import { acpConfiguration } from './acp-configuration.ts';
import { agentExit } from './process-exit-scenarios.ts';
import {
  scriptedInitialization,
  type ScriptedScenario,
  type ScriptedStep,
} from './scripted-scenario.ts';
import { terminalLogin } from './terminal-login.ts';

const signIn: AuthMethod = {
  id: 'sign-in',
  name: 'Sign in',
  description: 'Sign in with your subscription',
};

const apiKey: AuthMethod = {
  id: 'api-key',
  name: 'Use an API key',
  description: 'Requires setting the AGENT_API_KEY environment variable',
};

const withMethods = (
  authMethods: AuthMethod[],
): Pick<ScriptedScenario, 'initialize'> => ({
  initialize: { ...scriptedInitialization, authMethods },
});

// `session/new` answers `auth_required` until this Agent process signs in.
const signedOut = (): Pick<ScriptedScenario, 'authentication'> => ({
  authentication: { credentials: { signedIn: false } },
});

const authRequired = {
  code: RequestError.authRequired().code,
  message: 'Your subscription sign-in expired.',
};

type Steps = readonly ScriptedStep[];

const base = (steps: Steps): ScriptedScenario => ({
  configOptions: acpConfiguration,
  steps,
});

const signInRequired = (steps: Steps): ScriptedScenario => ({
  ...base(steps),
  ...signedOut(),
  ...withMethods([signIn]),
});

// The first method's first attempt fails, so its button returns.
const signInMethods = (steps: Steps): ScriptedScenario => ({
  ...base(steps),
  ...signedOut(),
  ...withMethods([signIn, apiKey]),
  responses: { authenticate: [{ error: 'The sign-in was refused.' }, {}] },
});

const terminalSignInRequired = (steps: Steps): ScriptedScenario => ({
  ...base(steps),
  ...signedOut(),
  initialize: terminalLogin.initialize,
});

// The first prompt ends `auth_required`; the next one answers.
const turnAuthRequired = (steps: Steps): ScriptedScenario => ({
  ...base(steps),
  ...withMethods([signIn]),
  responses: { 'session/prompt': [{ steps: [], error: authRequired }, {}] },
});

// Exits while opening its first Session; once it has, App E2E relaunches it as `reply` (scripted-agent-process.ts).
const openExitOnce = (steps: Steps): ScriptedScenario => ({
  ...base(steps),
  responses: { 'session/new': [{ steps: [agentExit] }] },
});

type SignInScenarioName =
  | 'sign-in-required'
  | 'sign-in-methods'
  | 'terminal-sign-in-required'
  | 'turn-auth-required'
  | 'open-exit-once';

// Sign-in fixtures for the App's sign-in and launch callouts; each Agent process starts signed out.
export const signInScenarios = (
  steps: Steps,
): Record<SignInScenarioName, ScriptedScenario> => ({
  'sign-in-required': signInRequired(steps),
  'sign-in-methods': signInMethods(steps),
  'terminal-sign-in-required': terminalSignInRequired(steps),
  'turn-auth-required': turnAuthRequired(steps),
  'open-exit-once': openExitOnce(steps),
});
