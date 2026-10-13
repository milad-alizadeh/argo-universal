import { homedir } from 'node:os';
import { createLoginAgentOpener, type AcpResourceInput } from '../acp';
import {
  createAgentLogins,
  type AgentInstallations,
  isAgentDisabled,
  selectAgentLaunchResolver,
} from '../agents';
import type { OpenSessionsActorRef } from '../sessions';

type LoginSources = {
  sessions: OpenSessionsActorRef;
  installations?: Pick<AgentInstallations, 'isBusy'>;
  createId: () => string;
  acp?: AcpResourceInput;
  loginTimeoutMs?: number;
  loginCleanupTimeoutMs?: number;
};
export const createEngineAgentLogins = (
  input: LoginSources,
): ReturnType<typeof createAgentLogins> =>
  createAgentLogins({
    createId: input.createId,
    isAgentSetupBusy: (agentId) =>
      input.installations?.isBusy(agentId) ?? false,
    timeoutMs: input.loginTimeoutMs,
    cleanupTimeoutMs: input.loginCleanupTimeoutMs,
    openLoginAgent: createLoginAgentOpener(input.acp),
    reserveAuthentication: (launch) =>
      loginResources(input.sessions).reserveAuthentication(launch),
    resolveLaunch: (agentId) => resolveLoginLaunch(input.sessions, agentId),
  });

type LoginLaunch = {
  name: string;
  launch: Awaited<
    ReturnType<NonNullable<ReturnType<typeof selectAgentLaunchResolver>>>
  >;
};
async function resolveLoginLaunch(
  sessions: OpenSessionsActorRef,
  agentId: string,
): Promise<LoginLaunch> {
  const resolve = loginLaunchResolver(sessions, agentId);
  const launch = await resolve({
    agent: agentId,
    projectId: '',
    projectPath: homedir(),
  });
  return { name: agentId, launch };
}

function loginResources(
  sessions: OpenSessionsActorRef,
): NonNullable<
  ReturnType<OpenSessionsActorRef['getSnapshot']>['context']['acpResources']
> {
  const resources = sessions.getSnapshot().context.acpResources;
  if (!resources) throw new Error('ACP resources are unavailable');
  return resources;
}

function loginLaunchResolver(
  sessions: OpenSessionsActorRef,
  agentId: string,
): NonNullable<ReturnType<typeof selectAgentLaunchResolver>> {
  const source = sessions.getSnapshot().context;
  if (isAgentDisabled(source.database, agentId))
    throw new Error('Agent is disabled');
  const resolve = selectAgentLaunchResolver(source, agentId);
  if (!resolve) throw new Error('No ACP launch is configured for this Agent');
  return resolve;
}
