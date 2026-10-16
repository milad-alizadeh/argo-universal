import { randomUUID } from 'node:crypto';
import {
  createAgentChecker,
  checkAgentLaunch,
  type AcpResourceInput,
} from '../agents';
import { AgentInstallations, type AgentsRouterDeps } from '../agents';
import type { BlobUploadDeps } from '../blob';
import { type FeedDeps } from '../feed';
import type { NotificationsDeps } from '../notifications';
import type { PluginsDeps } from '../plugins';
import {
  createSessionConnections,
  createSessionReader,
  createSessionSnapshotWatcher,
  type OpenSessionsActorRef,
  type SessionRouterDeps,
} from '../sessions';
import type { SystemDeps } from '../system';
import {
  createFeedSources,
  type FeedSources,
  type FeedSourcesInput,
} from './feed-sources';

export { createFeedSources } from './feed-sources';

export type AppRouterDeps = SessionRouterDeps &
  AgentsRouterDeps &
  BlobUploadDeps &
  SystemDeps &
  FeedDeps &
  NotificationsDeps &
  PluginsDeps;

// The Engine supplies the ACP check to the Agents module itself.
type EngineSupplied =
  | keyof FeedDeps
  | 'createId'
  | 'checkAgentLaunch'
  | 'installations'
  | 'dropAgentConnections'
  | 'sessionConnections';

export type AppRouterInput = Omit<AppRouterDeps, EngineSupplied> &
  FeedSourcesInput &
  Partial<Pick<AppRouterDeps, 'createId' | 'installations'>> & {
    acp?: AcpResourceInput;
  };

export function createAppRouterDeps(
  input: AppRouterInput,
  sources: FeedSources = createFeedSources(input),
): AppRouterDeps {
  const setup = createAgentSetup(input);
  bindInstallations(setup.installations, { ...input, ...setup });

  return {
    ...input,
    ...sources,
    ...setup,
    checkAgentLaunch: createAgentChecker(input.acp?.launchProcess),
    readSession: createSessionReader(input.database),
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}

function bindInstallations(
  installations: AgentInstallations,
  input: AppRouterInput & Pick<AppRouterDeps, 'createId' | 'invalidateAgent'>,
): void {
  installations.bind({
    ...input,
    checkAgentLaunch,
    invalidateAgent: input.invalidateAgent,
    isInUse: (agentId) => sessionsUseAgent(input.sessions, agentId),
  });
}

type AgentSetup = Pick<
  AppRouterDeps,
  | 'installations'
  | 'createId'
  | 'invalidateAgent'
  | 'invalidateIdleAgents'
  | 'dropAgentConnections'
  | 'sessionConnections'
>;

function createAgentSetup(input: AppRouterInput): AgentSetup {
  const installations = input.installations ?? createInstallations(input.home);
  const sessionConnections = createSessionConnections(input.sessions);

  const { invalidateAgent, invalidateIdleAgents, dropAgentConnections } =
    sessionConnections.acpResources();

  return {
    installations,
    invalidateAgent,
    invalidateIdleAgents,
    dropAgentConnections,
    sessionConnections,
    createId: input.createId ?? randomUUID,
  };
}

const createInstallations = (home = ''): AgentInstallations =>
  new AgentInstallations(home);

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
