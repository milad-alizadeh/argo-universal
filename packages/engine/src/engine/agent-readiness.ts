import { randomUUID } from 'node:crypto';
import {
  type AgentInstallations,
  type AgentReadiness,
  createAgentChecker,
  createAgentReadiness,
} from '../agents';
import type { OpenSessionsActorRef } from '../sessions';
import type { AppRouterDeps, AppRouterInput } from './router-deps';

type AgentSetup = Pick<AppRouterDeps, 'installations' | 'agentLogins'>;
type Wired = Pick<AppRouterDeps, 'checkAgentLaunch' | 'readiness'>;

// Readiness checks the same saved launch a Session uses, under the installation's setup ownership.
function createReadiness(
  input: AppRouterInput,
  installations: AgentInstallations,
  checkAgentLaunch: AppRouterDeps['checkAgentLaunch'],
): AgentReadiness {
  const { database, databaseWriter } = input;
  const home = input.home ?? '';
  const withAgentCheck = installations.check;
  const deps = { database, databaseWriter, home, now: Date.now };
  return createAgentReadiness(
    { ...deps, checkAgentLaunch, withAgentCheck },
    input.automaticReadiness ?? false,
  );
}

function sessionsUseAgent(
  sessions: OpenSessionsActorRef,
  agentId: string,
): boolean {
  const { acpResources, sessions: open } = sessions.getSnapshot().context;
  return (
    !!acpResources?.isAgentInUse(agentId) ||
    Object.values(open).some((session) => {
      const { agent } = session.getSnapshot().context;
      return !agent || agent === agentId;
    })
  );
}

function bindInstallations(input: AppRouterInput & AgentSetup & Wired): void {
  input.installations.bind({
    ...input,
    createId: input.createId ?? randomUUID,
    isInUse: (agentId) =>
      input.agentLogins.isBusy(agentId) ||
      sessionsUseAgent(input.sessions, agentId),
    afterInstall: input.readiness.recheckLater,
  });
}

// Checks again after install, sign-in and enablement, and every Agent once at Server start.
export function wireAgentReadiness(
  input: AppRouterInput,
  setup: AgentSetup,
): Wired {
  const checkAgentLaunch = createAgentChecker(input.acp?.launchProcess);
  const readiness = createReadiness(
    input,
    setup.installations,
    checkAgentLaunch,
  );
  bindInstallations({ ...input, ...setup, checkAgentLaunch, readiness });
  setup.agentLogins.afterLogin(readiness.recheckLater);
  readiness.recheckEveryLater();
  return { checkAgentLaunch, readiness };
}
