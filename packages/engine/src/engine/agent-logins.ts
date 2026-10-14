import { homedir } from 'node:os';
import { createLoginAgentOpener, type AcpResourceInput } from '../agents';
import {
  createAgentLogins,
  type AgentInstallations,
  isAgentDisabled,
  resolveInstalledAgentLaunch,
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
const authenticationResources = (
  sessions: OpenSessionsActorRef,
): Pick<
  Parameters<typeof createAgentLogins>[0],
  'reserveAuthentication' | 'settleAuthentication'
> => ({
  reserveAuthentication: (launch) =>
    loginResources(sessions).reserveAuthentication(launch),
  settleAuthentication: (launch) =>
    loginResources(sessions).settleAuthentication(launch),
});
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
    ...authenticationResources(input.sessions),
    resolveLaunch: (agentId) => resolveLoginLaunch(input.sessions, agentId),
  });

type LoginLaunch = {
  name: string;
  launch: Awaited<
    ReturnType<NonNullable<ReturnType<typeof resolveInstalledAgentLaunch>>>
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
  return sessions.getSnapshot().context.acpResources;
}

function loginLaunchResolver(
  sessions: OpenSessionsActorRef,
  agentId: string,
): NonNullable<ReturnType<typeof resolveInstalledAgentLaunch>> {
  const source = sessions.getSnapshot().context;
  if (isAgentDisabled(source.database, agentId))
    throw new Error('Agent is disabled');
  return resolveInstalledAgentLaunch(source.database, source.runtimeDirectory);
}
