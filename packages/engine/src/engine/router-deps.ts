import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { readChangesSummary } from '@repo/git';
import type { AcpResourceInput } from '../agents';
import { type AgentsRouterDeps } from '../agents';
import type { AppNavigationDeps } from '../app-navigation';
import type { BlobUploadDeps } from '../blob';
import { type FeedDeps } from '../feed';
import type { NotificationsDeps } from '../notifications';
import type { OperationWaitClock, SessionTokens } from '../operations';
import type { PluginsRouterDeps } from '../plugins';
import {
  createSessionConnections,
  createSessionReader,
  createSessionSnapshotWatcher,
  sessionChangesSelection,
  type SessionSources,
} from '../sessions';
import type { SystemDeps } from '../system';
import {
  createFeedSources,
  type FeedSources,
  type FeedSourcesInput,
} from './feed-sources';

export { createFeedSources } from './feed-sources';

export type AppRouterDeps = SessionSources &
  AgentsRouterDeps &
  BlobUploadDeps &
  SystemDeps &
  FeedDeps &
  NotificationsDeps &
  AppNavigationDeps & {
    userHome: string;
    sessionTokens: SessionTokens;
    controlToken: string;
    plugins: PluginsRouterDeps;
    operationWaitClock?: OperationWaitClock;
  };

// The Engine owns connection lifetimes and shared Feed sources.
type EngineSupplied =
  | keyof FeedDeps
  | 'createId'
  | 'userHome'
  | 'dropAgentConnections'
  | 'sessionConnections'
  | 'installedAgents';

export type AppRouterInput = Omit<AppRouterDeps, EngineSupplied> &
  FeedSourcesInput &
  Partial<Pick<AppRouterDeps, 'createId' | 'userHome'>> & {
    acp?: AcpResourceInput;
  };

export function createAppRouterDeps(
  input: AppRouterInput,
  sources: FeedSources = createFeedSources(input),
): AppRouterDeps {
  const setup = createAgentSetup(input);
  const readSession = createSessionReader(input.database);

  return {
    ...input,
    ...sources,
    ...setup,
    readSession,
    readStoredChangesSummary: createStoredChangesReader(input, readSession),
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}

function createStoredChangesReader(
  input: AppRouterInput,
  readSession: ReturnType<typeof createSessionReader>,
): FeedDeps['readStoredChangesSummary'] {
  return (sessionId) => {
    const session = readSession(sessionId);

    return readChangesSummary(sessionChangesSelection(input.database, session));
  };
}

type AgentSetup = Pick<
  AppRouterDeps,
  | 'createId'
  | 'userHome'
  | 'dropAgentConnections'
  | 'sessionConnections'
  | 'installedAgents'
>;

function createAgentSetup(input: AppRouterInput): AgentSetup {
  const sessionConnections = createSessionConnections(input.sessions);

  const { dropAgentConnections } = sessionConnections.acpResources();

  return {
    dropAgentConnections,
    sessionConnections,
    installedAgents: input.sessions.getSnapshot().context.installedAgents,
    createId: input.createId ?? randomUUID,
    userHome: input.userHome ?? homedir(),
  };
}
