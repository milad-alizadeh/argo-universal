import type {
  AgentAuthenticateInput,
  AgentAuthenticateOutput,
  AgentAuthSubject,
  AgentAuthTerminalFrame,
  AgentAuthTerminalInput,
} from '@repo/contracts';
import type { AgentsRouterDeps } from '../router';
import { authenticationLaunch } from './auth-launch';
import {
  authenticationFailed,
  type ConnectionAuthentication,
} from './authenticate';

type Subject = AgentAuthSubject & { sessionId?: string };

const missingConnection = 'Session connection is unavailable';

const closedTerminal: AgentAuthTerminalFrame = {
  cursor: 0,
  output: '',
  closed: true,
};

const requireSessionAuthentication = (
  deps: AgentsRouterDeps,
  subject: Subject,
  sessionId: string,
): ConnectionAuthentication => {
  const found = deps.sessionConnections.authentication(sessionId, subject);

  if (!found) throw new Error(missingConnection);

  return found;
};

// Reading the sign-in state may start the Agent, since its methods come from `initialize`.
export const authentication = async (
  deps: AgentsRouterDeps,
  subject: Subject,
): Promise<ConnectionAuthentication> => {
  if (subject.sessionId)
    return requireSessionAuthentication(deps, subject, subject.sessionId);

  return (
    (await existingAuthentication(deps, subject)) ??
    authenticationLaunch(deps, subject)
  );
};

// The connection already running for this Agent and Project; never launches one.
const existingAuthentication = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<ConnectionAuthentication | null> =>
  deps.sessionConnections
    .acpResources()
    .findAuthentication(subject.agent, subject.projectId)
    ?.catch(() => null) ?? null;

const requireAdmission = (deps: AgentsRouterDeps): void =>
  deps.sessionCommandSignal?.throwIfAborted();

export const authenticate = async (
  deps: AgentsRouterDeps,
  input: AgentAuthenticateInput,
): Promise<AgentAuthenticateOutput> => {
  requireAdmission(deps);

  try {
    const found = await authentication(deps, input);
    // Shutdown may have begun while the connection was found or launched.
    requireAdmission(deps);

    return await found.authenticate(input.methodId);
  } catch (cause) {
    return authenticationFailed(cause);
  }
};

export const cancelAuthentication = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<void> => {
  await (await existingAuthentication(deps, subject))?.cancel();
};

export const readAuthTerminal = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
  cursor: number,
): Promise<AgentAuthTerminalFrame> =>
  (await existingAuthentication(deps, subject))?.readTerminal(cursor) ??
  closedTerminal;

export const writeAuthTerminal = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
  input: AgentAuthTerminalInput,
): Promise<void> => {
  (await existingAuthentication(deps, subject))?.inputTerminal(input);
};
