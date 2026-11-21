import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { readChangesSummary } from '@repo/git';
import type { AcpResourceInput } from '../agents';
import { type AgentsRouterDeps } from '../agents';
import type { AppNavigationDeps } from '../app-navigation';
import type { BlobUploadDeps } from '../blob';
import {
  feedNotices,
  noConversations,
  type ConversationsPort,
} from '../conversation';
import type { DevicesDeps } from '../devices';
import { type FeedDeps } from '../feed';
import type { NetworkAccessDeps } from '../network-access';
import type { NotificationsDeps } from '../notifications';
import type { OperationWaitClock, SessionTokens } from '../operations';
import type { PairingDeps } from '../pairing/router';
import type { PluginsRouterDeps } from '../plugins';
import type { Runs } from '../runs';
import { ScreenSight, type ScreenSightDeps } from '../screen-sight';
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
  DevicesDeps &
  FeedDeps &
  NotificationsDeps &
  NetworkAccessDeps &
  AppNavigationDeps &
  ScreenSightDeps &
  PairingDeps & {
    userHome: string;
    sessionTokens: SessionTokens;
    controlToken: string;
    plugins: PluginsRouterDeps;
    conversation: ConversationsPort;
    runs: Runs;
    operationWaitClock?: OperationWaitClock;
  };

// The Engine owns connection lifetimes and shared Feed sources.
type EngineSupplied =
  | keyof FeedDeps
  | 'createId'
  | 'userHome'
  | 'conversation'
  | 'screenSight'
  | 'dropAgentConnections'
  | 'sessionConnections'
  | 'installedAgents';

export type AppRouterInput = Omit<AppRouterDeps, EngineSupplied> &
  FeedSourcesInput &
  Partial<
    Pick<
      AppRouterDeps,
      'createId' | 'userHome' | 'conversation' | 'screenSight'
    >
  > & {
    acp?: AcpResourceInput;
  };

// The Feed is where a capture's Notice is written.
const screenSightOf = (
  input: AppRouterInput,
  sources: Pick<FeedSources, 'findFeed'>,
): ScreenSight => input.screenSight ?? new ScreenSight(feedNotices(sources));

export function createAppRouterDeps(
  input: AppRouterInput,
  sources: FeedSources = createFeedSources(input),
): AppRouterDeps {
  const setup = createAgentSetup(input, sources);
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
  | 'conversation'
  | 'screenSight'
  | 'dropAgentConnections'
  | 'sessionConnections'
  | 'installedAgents'
>;

const conversationOf = (input: AppRouterInput): ConversationsPort =>
  input.conversation ?? noConversations;

// What the Engine's callers reach the Conversation and the screen through.
const portsOf = (
  input: AppRouterInput,
  sources: Pick<FeedSources, 'findFeed'>,
): Pick<AppRouterDeps, 'conversation' | 'screenSight'> => ({
  conversation: conversationOf(input),
  screenSight: screenSightOf(input, sources),
});

function createAgentSetup(
  input: AppRouterInput,
  sources: Pick<FeedSources, 'findFeed'>,
): AgentSetup {
  const sessionConnections = createSessionConnections(input.sessions);

  const { dropAgentConnections } = sessionConnections.acpResources();

  return {
    dropAgentConnections,
    sessionConnections,
    installedAgents: input.sessions.getSnapshot().context.installedAgents,
    createId: input.createId ?? randomUUID,
    userHome: input.userHome ?? homedir(),
    ...portsOf(input, sources),
  };
}
