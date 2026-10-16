import type {
  AgentAuthenticateInput,
  AgentAuthenticateOutput,
  AgentAuthSubject,
} from '@repo/contracts';
import type { SessionActorRef } from '../../sessions';
import type { AcpResources } from '../acp/resource-types';
import type { AgentsRouterDeps } from '../router';
import { authenticationLaunch } from './auth-launch';
import {
  authenticationFailed,
  type ConnectionAuthentication,
} from './authenticate';

type Subject = AgentAuthSubject & { sessionId?: string };

const resourcesOf = (deps: AgentsRouterDeps): AcpResources =>
  deps.sessions.getSnapshot().context.acpResources;

const missingConnection = 'Session connection is unavailable';

type LiveSession = ReturnType<SessionActorRef['getSnapshot']>['context'];

const readSession = (
  deps: AgentsRouterDeps,
  sessionId: string,
): LiveSession => {
  const actor = deps.sessions.getSnapshot().context.sessions[sessionId];

  if (!actor) throw new Error(missingConnection);

  return actor.getSnapshot().context;
};

const sameSubject = (session: LiveSession, subject: Subject): boolean =>
  session.agent === subject.agent && session.projectId === subject.projectId;

const requireAuthentication = (
  connection: ConnectionAuthentication | undefined,
): ConnectionAuthentication => {
  if (!connection) throw new Error(missingConnection);

  return connection;
};

const sessionAuthentication = (
  deps: AgentsRouterDeps,
  subject: Subject,
  sessionId: string,
): ConnectionAuthentication => {
  const session = readSession(deps, sessionId);

  if (!sameSubject(session, subject)) throw new Error(missingConnection);

  return requireAuthentication(session.acpLease?.authentication);
};

export const authentication = async (
  deps: AgentsRouterDeps,
  subject: Subject,
): Promise<ConnectionAuthentication> => {
  if (subject.sessionId)
    return sessionAuthentication(deps, subject, subject.sessionId);
  const found = findAuthentication(deps, subject);

  if (found) return found;

  return authenticationLaunch(deps, subject);
};

const requireAdmission = (deps: AgentsRouterDeps): void =>
  deps.sessionCommandSignal?.throwIfAborted();

export const authenticate = async (
  deps: AgentsRouterDeps,
  input: AgentAuthenticateInput,
): Promise<AgentAuthenticateOutput> => {
  requireAdmission(deps);

  try {
    const connection = await authentication(deps, input);
    requireAdmission(deps);

    return await connection.authenticate(input.methodId);
  } catch (cause) {
    return authenticationFailed(cause);
  }
};

export const cancelAuthentication = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<void> => {
  const found = resourcesOf(deps).findAuthentication(
    subject.agent,
    subject.projectId,
  );

  await (await found)?.cancel();
};

export const findAuthentication = (
  deps: AgentsRouterDeps,
  subject: Subject,
): Promise<ConnectionAuthentication> | undefined => {
  if (subject.sessionId)
    return Promise.resolve(
      sessionAuthentication(deps, subject, subject.sessionId),
    );

  return resourcesOf(deps).findAuthentication(subject.agent, subject.projectId);
};

export const existingAuthentication = async (
  deps: AgentsRouterDeps,
  subject: Subject,
): Promise<ConnectionAuthentication> =>
  requireAuthentication(await findAuthentication(deps, subject));
