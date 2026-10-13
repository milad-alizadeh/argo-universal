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
const authenticationReservation =
  (
    sessions: OpenSessionsActorRef,
  ): Parameters<typeof createAgentLogins>[0]['reserveAuthentication'] =>
  (launch) => {
    const resources = sessions.getSnapshot().context.acpResources;
    if (!resources) throw new Error('ACP resources are unavailable');
    return resources.reserveAuthentication(launch);
  };

const loginProject = (): { projectId: string; projectPath: string } => ({
  projectId: '',
  projectPath: homedir(),
});

const loginLaunchResolver =
  (
    sessions: OpenSessionsActorRef,
  ): Parameters<typeof createAgentLogins>[0]['resolveLaunch'] =>
  async (agentId) => {
    const source = sessions.getSnapshot().context;
    if (isAgentDisabled(source.database, agentId))
      throw new Error('Agent is disabled');
    const resolve = selectAgentLaunchResolver(source, agentId);
    if (!resolve) throw new Error('No ACP launch is configured for this Agent');
    const launch = await resolve({
      agent: agentId,
      ...loginProject(),
    });
    return { name: agentId, launch };
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
    reserveAuthentication: authenticationReservation(input.sessions),
    resolveLaunch: loginLaunchResolver(input.sessions),
  });
