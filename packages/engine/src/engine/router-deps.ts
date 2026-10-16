import { randomUUID } from 'node:crypto';
import type { AcpResourceInput } from '../agents';
import { type AgentsRouterDeps } from '../agents';
import type { BlobUploadDeps } from '../blob';
import { type FeedDeps } from '../feed';
import type { NotificationsDeps } from '../notifications';
import type { PluginsDeps } from '../plugins';
import {
  createSessionConnections,
  createSessionReader,
  createSessionSnapshotWatcher,
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

// The Engine owns connection lifetimes and shared Feed sources.
type EngineSupplied =
  | keyof FeedDeps
  | 'createId'
  | 'dropAgentConnections'
  | 'sessionConnections';

export type AppRouterInput = Omit<AppRouterDeps, EngineSupplied> &
  FeedSourcesInput &
  Partial<Pick<AppRouterDeps, 'createId'>> & {
    acp?: AcpResourceInput;
  };

export function createAppRouterDeps(
  input: AppRouterInput,
  sources: FeedSources = createFeedSources(input),
): AppRouterDeps {
  const setup = createAgentSetup(input);

  return {
    ...input,
    ...sources,
    ...setup,
    readSession: createSessionReader(input.database),
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}

type AgentSetup = Pick<
  AppRouterDeps,
  'createId' | 'dropAgentConnections' | 'sessionConnections'
>;

function createAgentSetup(input: AppRouterInput): AgentSetup {
  const sessionConnections = createSessionConnections(input.sessions);

  const { dropAgentConnections } = sessionConnections.acpResources();

  return {
    dropAgentConnections,
    sessionConnections,
    createId: input.createId ?? randomUUID,
  };
}
